package com.xpertsedge.lms;

import com.xpertsedge.lms.auth.IdentityService;
import com.xpertsedge.lms.config.BootstrapAdmin;
import com.xpertsedge.lms.domain.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.json.JsonMapper;
import java.net.*;
import java.net.http.*;
import java.time.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties="spring.datasource.url=jdbc:h2:mem:operations-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
@ActiveProfiles("test")
class InstituteOperationsTests {
    @Value("${local.server.port}") int port;
    @Autowired IdentityService identities;
    @Autowired UserRepository users;
    @Autowired JdbcTemplate db;
    final JsonMapper json=JsonMapper.builder().build();
    static final String PASSWORD="TeachingTestPassword42!";
    class Browser {
        final CookieManager cookies=new CookieManager(null,CookiePolicy.ACCEPT_ALL);
        final HttpClient client=HttpClient.newBuilder().cookieHandler(cookies).build();
        String csrf;
        HttpResponse<String> send(String method,String path,Object body)throws Exception{
            HttpRequest.Builder b=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).timeout(Duration.ofSeconds(20));
            if(csrf!=null)b.header("X-CSRF-TOKEN",csrf);
            if(body!=null)b.header("Content-Type","application/json");
            return client.send(b.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(),HttpResponse.BodyHandlers.ofString());
        }
        void token()throws Exception{csrf=(String)obj(send("GET","/api/auth/csrf",null)).get("token");}
        void login(String email)throws Exception{token();var r=send("POST","/api/auth/login",Map.of("email",email,"password",PASSWORD));assertEquals(200,r.statusCode(),r.body());token();}
        HttpResponse<String> upload(String course,String assignment,String filename,String contents)throws Exception{
            String boundary="LmsTestBoundary";
            String body="--"+boundary+"\r\nContent-Disposition: form-data; name=\"courseId\"\r\n\r\n"+course+"\r\n";
            if(assignment!=null)body+="--"+boundary+"\r\nContent-Disposition: form-data; name=\"assignmentId\"\r\n\r\n"+assignment+"\r\n";
            body+="--"+boundary+"\r\nContent-Disposition: form-data; name=\"file\"; filename=\""+filename+"\"\r\nContent-Type: application/octet-stream\r\n\r\n"+contents+"\r\n--"+boundary+"--\r\n";
            return client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/workspace/files")).header("Content-Type","multipart/form-data; boundary="+boundary).header("X-CSRF-TOKEN",csrf).POST(HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString());
        }
    }
    @SuppressWarnings("unchecked") Map<String,Object> obj(HttpResponse<String> r){return json.readValue(r.body(),Map.class);}
    @SuppressWarnings("unchecked") List<Map<String,Object>> rows(HttpResponse<String> r){assertEquals(200,r.statusCode(),r.body());return json.readValue(r.body(),List.class);}
    String created(HttpResponse<String> r){assertTrue(r.statusCode()==200||r.statusCode()==201,r.body());return obj(r).get("id").toString();}
    @Test void settingsNotificationsAndManualFees()throws Exception{
        Browser anonymous=new Browser();assertEquals(200,anonymous.send("GET","/api/public/settings",null).statusCode());
        identities.create("Manager","manager@ops.example",PASSWORD,Role.ADMIN);
        AppUser trainer=identities.create("Trainer","trainer@ops.example",PASSWORD,Role.TRAINER);
        AppUser s=identities.create("Student","student@ops.example",PASSWORD,Role.STUDENT);
        identities.create("Other Student","other@ops.example",PASSWORD,Role.STUDENT);
        Browser admin=new Browser();admin.login("manager@ops.example");Browser teacher=new Browser();teacher.login("trainer@ops.example");Browser student=new Browser();student.login("student@ops.example");Browser other=new Browser();other.login("other@ops.example");
        var settings=Map.of("name","XpertsEdge Technologies","email","support@ops.example","phone","+91 88707 83300","address","Training centre");
        assertEquals(403,student.send("PUT","/api/admin/settings",settings).statusCode());
        assertEquals(200,admin.send("PUT","/api/admin/settings",settings).statusCode());
        assertEquals("support@ops.example",obj(anonymous.send("GET","/api/public/settings",null)).get("email"));
        created(admin.send("POST","/api/admin/courses",Map.of("id","ops","name","Operations course","category","Development","description","Operations tests","published",true,"trainerId",trainer.getId())));
        created(admin.send("POST","/api/admin/enrolments",Map.of("studentId",s.getId(),"courseId","ops","status","ACTIVE")));
        String announcement=created(teacher.send("POST","/api/workspace/announcements",Map.of("courseId","ops","title","Class reminder","body","Bring your assignment.")));
        assertEquals(403,student.send("POST","/api/workspace/announcements",Map.of("courseId","ops","title","Forged notice","body","No")).statusCode());
        assertEquals(403,teacher.send("POST","/api/workspace/announcements",Map.of("title","Global","body","No")).statusCode());
        assertEquals(1,rows(student.send("GET","/api/workspace/announcements",null)).size());assertTrue(rows(other.send("GET","/api/workspace/announcements",null)).isEmpty());
        String notification="announcement-"+announcement;
        assertEquals(403,other.send("POST","/api/workspace/notifications/"+notification+"/read",null).statusCode());
        assertEquals(200,student.send("POST","/api/workspace/notifications/"+notification+"/read",null).statusCode());
        assertEquals(true,rows(student.send("GET","/api/workspace/notifications",null)).getFirst().get("read"));
        assertEquals(1,((Number)obj(student.send("GET","/api/workspace/reports",null)).get("accessibleCourses")).intValue());
        assertEquals(0,((Number)obj(other.send("GET","/api/workspace/reports",null)).get("accessibleCourses")).intValue());
        assertEquals(403,teacher.send("GET","/api/workspace/fees",null).statusCode());
        assertEquals(false,obj(student.send("GET","/api/workspace/fees",null)).get("onlinePaymentEnabled"));
        var invoice=Map.of("studentId",s.getId(),"courseId","ops","total",20000);
        assertEquals(403,student.send("POST","/api/workspace/fees",invoice).statusCode());
        String id=created(admin.send("POST","/api/workspace/fees",invoice));
        assertEquals(409,admin.send("POST","/api/workspace/fees",invoice).statusCode());
        String receipt=created(admin.send("POST","/api/workspace/fees/receipts",Map.of("invoiceId",id,"amount",7500,"reference","BANK-OPS-001","method","BANK")));
        assertEquals(409,admin.send("POST","/api/workspace/fees/receipts",Map.of("invoiceId",id,"amount",1000,"reference","BANK-OPS-001","method","BANK")).statusCode());
        assertEquals(400,admin.send("POST","/api/workspace/fees/receipts",Map.of("invoiceId",id,"amount",13000,"reference","BANK-OPS-002","method","BANK")).statusCode());
        assertEquals(400,admin.send("PUT","/api/workspace/fees/"+id,Map.of("total",5000)).statusCode());
        assertEquals(403,student.send("PUT","/api/workspace/fees/"+id,Map.of("total",0)).statusCode());
        var own=obj(student.send("GET","/api/workspace/fees",null));
        @SuppressWarnings("unchecked") var invoices=(List<Map<String,Object>>)own.get("invoices");
        assertEquals(12500,((Number)invoices.getFirst().get("balance")).intValue());
        assertTrue(((List<?>)obj(other.send("GET","/api/workspace/fees?studentId="+s.getId(),null)).get("invoices")).isEmpty());
        assertEquals(403,student.send("PUT","/api/workspace/fees/receipts/"+receipt+"/void",Map.of("reason","Fake")).statusCode());
        assertEquals(200,admin.send("PUT","/api/workspace/fees/receipts/"+receipt+"/void",Map.of("reason","Incorrect reference, correction required")).statusCode());
        @SuppressWarnings("unchecked") var corrected=(List<Map<String,Object>>)obj(student.send("GET","/api/workspace/fees",null)).get("invoices");
        assertEquals(20000,((Number)corrected.getFirst().get("balance")).intValue());
    }
}
