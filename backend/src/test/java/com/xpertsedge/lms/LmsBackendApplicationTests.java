package com.xpertsedge.lms;

import com.xpertsedge.lms.auth.IdentityService;
import com.xpertsedge.lms.domain.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.security.crypto.password.PasswordEncoder;
import tools.jackson.databind.json.JsonMapper;
import java.net.*;
import java.net.http.*;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class LmsBackendApplicationTests {
    @Value("${local.server.port}") int port;
    @Autowired IdentityService identities;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder passwords;
    final JsonMapper json=JsonMapper.builder().build();
    static final String PASSWORD="TestOnlyPassword42!";
    class Browser {
        CookieManager cookies=new CookieManager(null,CookiePolicy.ACCEPT_ALL);
        HttpClient client=HttpClient.newBuilder().cookieHandler(cookies).build();
        String csrf;
        HttpResponse<String> send(String method,String path,Object body,boolean token)throws Exception{
            HttpRequest.Builder b=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).timeout(Duration.ofSeconds(15));
            if(token&&csrf!=null)b.header("X-CSRF-TOKEN",csrf);
            if(body!=null)b.header("Content-Type","application/json");
            return client.send(b.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(),HttpResponse.BodyHandlers.ofString());
        }
        void token()throws Exception{HttpResponse<String> r=send("GET","/api/auth/csrf",null,false);assertEquals(200,r.statusCode());csrf=(String)object(r).get("token");}
        void login(String email)throws Exception{token();HttpResponse<String> r=send("POST","/api/auth/login",Map.of("email",email,"password",PASSWORD),true);assertEquals(200,r.statusCode(),r.body());token();}
    }
    @SuppressWarnings("unchecked") Map<String,Object> object(HttpResponse<String> r){return json.readValue(r.body(),Map.class);}
    @SuppressWarnings("unchecked") List<Map<String,Object>> list(HttpResponse<String> r){return json.readValue(r.body(),List.class);}

    @Test void adminDirectoryUpdatesAndDisablesAccounts()throws Exception{
        identities.create("Directory Admin","directory-admin@test.example",PASSWORD,Role.ADMIN);
        AppUser target=identities.create("Directory Student","directory-student@test.example",PASSWORD,Role.STUDENT);
        Browser admin=new Browser();admin.login("directory-admin@test.example");
        Browser student=new Browser();student.login("directory-student@test.example");
        String path="/api/admin/users/"+target.getId();
        assertEquals(403,student.send("PUT",path,Map.of("name","Hacked","email","hacked@test.example","enabled",true),true).statusCode());
        HttpResponse<String> updated=admin.send("PUT",path,Map.of("name","Updated Student","email","directory-updated@test.example","enabled",true),true);
        assertEquals(200,updated.statusCode(),updated.body());assertEquals("Updated Student",object(updated).get("name"));assertFalse(updated.body().contains("password"));
        assertEquals(400,admin.send("PUT",path,Map.of("name","Updated Student","email","directory-updated@test.example","enabled",true,"role","ADMIN"),true).statusCode());
        assertEquals(409,admin.send("PUT",path,Map.of("name","Updated Student","email","directory-admin@test.example","enabled",true),true).statusCode());
        assertEquals(200,admin.send("PUT",path,Map.of("name","Updated Student","email","directory-updated@test.example","enabled",false),true).statusCode());
        assertFalse(users.findById(target.getId()).orElseThrow().isEnabled());
        Browser disabled=new Browser();disabled.token();
        assertEquals(401,disabled.send("POST","/api/auth/login",Map.of("email","directory-updated@test.example","password",PASSWORD),true).statusCode());
        assertEquals(200,admin.send("PUT",path,Map.of("name","Updated Student","email","directory-updated@test.example","enabled",true),true).statusCode());
        disabled.login("directory-updated@test.example");
        assertTrue(list(admin.send("GET","/api/admin/users",null,false)).stream().anyMatch(row->row.get("id").equals(target.getId().toString())&&Boolean.TRUE.equals(row.get("enabled"))));
    }

    @Test void realHttpSecurityAndEnrolmentFlow()throws Exception{
        Browser student=new Browser();
        assertEquals(200,student.send("GET","/api/health",null,false).statusCode());
        assertEquals(6,list(student.send("GET","/api/courses",null,false)).size());
        assertEquals(401,student.send("GET","/api/admin/users",null,false).statusCode());
        assertEquals(403,student.send("POST","/api/auth/login",Map.of("email","student@test.example","password",PASSWORD),false).statusCode());
        HttpResponse<String> tokenResponse=new Browser().send("GET","/api/auth/csrf",null,false);
        String cookie=tokenResponse.headers().firstValue("set-cookie").orElse("");
        assertTrue(cookie.contains("HttpOnly"));assertTrue(cookie.contains("SameSite=Lax"));
        student.token();
        assertEquals(400,student.send("POST","/api/auth/register",Map.of("name","Student One","email","student@test.example","password",PASSWORD,"role","ADMIN"),true).statusCode());
        HttpResponse<String> registered=student.send("POST","/api/auth/register",Map.of("name","Student One","email","STUDENT@test.example","password",PASSWORD),true);
        assertEquals(201,registered.statusCode(),registered.body());assertEquals("STUDENT",object(registered).get("role"));assertFalse(registered.body().contains("password"));
        String studentId=(String)object(registered).get("id");
        assertTrue(passwords.matches(PASSWORD,users.findByEmail("student@test.example").orElseThrow().getPasswordHash()));
        assertEquals(409,student.send("POST","/api/auth/register",Map.of("name","Duplicate","email","student@test.example","password",PASSWORD),true).statusCode());
        assertEquals(401,student.send("POST","/api/auth/login",Map.of("email","student@test.example","password","wrong-password"),true).statusCode());
        String beforeLoginToken=student.csrf;
        String beforeSession=student.cookies.getCookieStore().getCookies().stream().filter(c->c.getName().equals("XPERTSEDGE_SESSION")).findFirst().orElseThrow().getValue();
        assertEquals(200,student.send("POST","/api/auth/login",Map.of("email","student@test.example","password",PASSWORD),true).statusCode());
        String afterSession=student.cookies.getCookieStore().getCookies().stream().filter(c->c.getName().equals("XPERTSEDGE_SESSION")).findFirst().orElseThrow().getValue();
        assertNotEquals(beforeSession,afterSession,"Login must rotate the session ID.");
        student.csrf=beforeLoginToken;
        assertEquals(403,student.send("POST","/api/auth/logout",null,true).statusCode());
        student.token();
        assertEquals("STUDENT",object(student.send("GET","/api/auth/me",null,false)).get("role"));
        assertEquals(403,student.send("GET","/api/admin/users",null,false).statusCode());
        assertEquals(403,student.send("GET","/api/trainer/courses",null,false).statusCode());
        assertEquals(403,student.send("POST","/api/admin/users",Map.of("name","Fake Admin","email","fake@test.example","password",PASSWORD,"role","ADMIN"),true).statusCode());
        assertEquals(403,student.send("GET","/api/courses/dev/access",null,false).statusCode());

        identities.create("Test Administrator","admin@test.example",PASSWORD,Role.ADMIN);
        Browser admin=new Browser();admin.login("admin@test.example");
        HttpResponse<String> trainerCreated=admin.send("POST","/api/admin/users",Map.of("name","Test Trainer","email","trainer@test.example","password",PASSWORD,"role","TRAINER"),true);
        assertEquals(201,trainerCreated.statusCode());String trainerId=(String)object(trainerCreated).get("id");
        assertFalse(admin.send("GET","/api/admin/users",null,false).body().contains("password"));
        for(boolean published:List.of(true,false)){
            String id=published?"assigned-lab":"draft-lab";
            assertEquals(201,admin.send("POST","/api/admin/courses",Map.of("id",id,"name","Test course","category","Testing","description","Integration test course","price",100,"published",published,"trainerId",trainerId),true).statusCode());
        }
        assertFalse(student.send("GET","/api/courses",null,false).body().contains("draft-lab"));
        LocalDate today=LocalDate.now(ZoneId.of("Asia/Kolkata"));
        HttpResponse<String> enrol=admin.send("POST","/api/admin/enrolments",Map.of("studentId",studentId,"courseId","dev","status","ACTIVE","expiresAt",today.toString()),true);
        assertEquals(201,enrol.statusCode(),enrol.body());String enrolId=(String)object(enrol).get("id");
        assertEquals(200,student.send("GET","/api/courses/dev/access",null,false).statusCode());
        assertEquals(409,admin.send("POST","/api/admin/enrolments",Map.of("studentId",studentId,"courseId","dev","status","ACTIVE"),true).statusCode());
        AppUser other=identities.create("Other Student","other@test.example",PASSWORD,Role.STUDENT);
        assertEquals(201,admin.send("POST","/api/admin/enrolments",Map.of("studentId",other.getId().toString(),"courseId","test","status","ACTIVE"),true).statusCode());
        List<Map<String,Object>> own=list(student.send("GET","/api/student/enrolments?studentId="+other.getId(),null,false));
        assertEquals(1,own.size());assertEquals(studentId,own.getFirst().get("studentId"));
        assertEquals(200,admin.send("PUT","/api/admin/enrolments/"+enrolId,Map.of("status","REVOKED"),true).statusCode());
        assertEquals(403,student.send("GET","/api/courses/dev/access",null,false).statusCode());
        assertEquals(200,admin.send("PUT","/api/admin/enrolments/"+enrolId,Map.of("status","ACTIVE","expiresAt",today.minusDays(1).toString()),true).statusCode());
        assertEquals(403,student.send("GET","/api/courses/dev/access",null,false).statusCode());
        assertEquals(201,admin.send("POST","/api/admin/enrolments",Map.of("studentId",studentId,"courseId","draft-lab","status","ACTIVE"),true).statusCode());
        assertEquals(403,student.send("GET","/api/courses/draft-lab/access",null,false).statusCode());
        Browser trainer=new Browser();trainer.login("trainer@test.example");
        assertEquals(2,list(trainer.send("GET","/api/trainer/courses",null,false)).size());
        assertEquals(200,trainer.send("GET","/api/courses/assigned-lab/access",null,false).statusCode());
        assertEquals(403,trainer.send("GET","/api/courses/dev/access",null,false).statusCode());
        assertEquals(403,trainer.send("GET","/api/admin/users",null,false).statusCode());
        assertEquals(403,trainer.send("GET","/api/student/enrolments",null,false).statusCode());
        assertEquals(204,student.send("POST","/api/auth/logout",null,true).statusCode());
        assertEquals(401,student.send("GET","/api/auth/me",null,false).statusCode());
        HttpRequest forbiddenOrigin=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/courses")).header("Origin","https://untrusted.example").GET().build();
        assertEquals(403,HttpClient.newHttpClient().send(forbiddenOrigin,HttpResponse.BodyHandlers.ofString()).statusCode());
        HttpRequest allowedOrigin=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/auth/login")).header("Origin","http://localhost:5173").header("Access-Control-Request-Method","POST").header("Access-Control-Request-Headers","Content-Type,X-CSRF-TOKEN").method("OPTIONS",HttpRequest.BodyPublishers.noBody()).build();
        HttpResponse<String> preflight=HttpClient.newHttpClient().send(allowedOrigin,HttpResponse.BodyHandlers.ofString());
        assertEquals(200,preflight.statusCode());assertEquals("http://localhost:5173",preflight.headers().firstValue("Access-Control-Allow-Origin").orElse(""));
        assertEquals("true",preflight.headers().firstValue("Access-Control-Allow-Credentials").orElse(""));
    }
}
