package com.xpertsedge.lms;

import com.xpertsedge.lms.auth.IdentityService;
import com.xpertsedge.lms.config.BootstrapAdmin;
import com.xpertsedge.lms.domain.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterAll;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import java.sql.DriverManager;
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

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties="spring.datasource.url=jdbc:h2:mem:workflow-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
@ActiveProfiles("test")
class WorkspaceWorkflowTests {
    @Value("${local.server.port}") int port;
    @Autowired IdentityService identities;
    @Autowired UserRepository users;
    @Autowired JdbcTemplate db;
    final JsonMapper json=JsonMapper.builder().build();
    static final String PASSWORD="Workflow-"+UUID.randomUUID();
    static boolean postgres(){return "true".equals(System.getenv("LMS_POSTGRES_VERIFY"));}
    static String schema(){String name=System.getenv("LMS_POSTGRES_TEST_SCHEMA");if(name==null||!name.matches("lms_verify_[a-f0-9]{16}"))throw new IllegalStateException("Use a generated, isolated verification schema.");return name;}
    @DynamicPropertySource static void database(DynamicPropertyRegistry registry){
        if(!postgres())return;
        String name=schema();
        registry.add("spring.datasource.url",()->"jdbc:postgresql://127.0.0.1:5432/xpertsedge_lms?currentSchema="+name);
        registry.add("spring.datasource.driver-class-name",()->"org.postgresql.Driver");
        registry.add("spring.datasource.username",()->"xpertsedge");
        registry.add("spring.datasource.password",()->System.getenv("DB_PASSWORD"));
        registry.add("spring.flyway.schemas",()->name);
        registry.add("spring.flyway.default-schema",()->name);
        registry.add("spring.jpa.properties.hibernate.default_schema",()->name);
    }
    @AfterAll static void cleanup()throws Exception{
        if(!postgres())return;
        String name=schema();
        try(var connection=DriverManager.getConnection("jdbc:postgresql://127.0.0.1:5432/xpertsedge_lms?currentSchema="+name,"xpertsedge",System.getenv("DB_PASSWORD"));var statement=connection.createStatement()){
            var current=statement.executeQuery("SELECT current_schema()");assertTrue(current.next());assertEquals(name,current.getString(1));current.close();
            statement.execute("DROP SCHEMA "+name+" CASCADE");
        }
    }
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
    @Test void adminToCertificateAndOwnProfileWorkflow()throws Exception{
        identities.create("Workflow Administrator","admin@workflow.example",PASSWORD,Role.ADMIN);
        Browser admin=new Browser();admin.login("admin@workflow.example");
        String trainer=created(admin.send("POST","/api/admin/users",Map.of("name","Workflow Trainer","email","trainer@workflow.example","password",PASSWORD,"role","TRAINER")));
        Browser student=new Browser();student.token();
        String studentId=created(student.send("POST","/api/auth/register",Map.of("name","Workflow Student","email","student@workflow.example","password",PASSWORD)));
        student.login("student@workflow.example");
        Browser teacher=new Browser();teacher.login("trainer@workflow.example");
        String course=created(admin.send("POST","/api/admin/courses",Map.of("id","workflow-course","name","Workflow verification","category","Development","description","Isolated verification records","price",1000,"published",true,"trainerId",trainer)));
        created(admin.send("POST","/api/admin/enrolments",Map.of("studentId",studentId,"courseId",course,"status","ACTIVE")));
        String batch=created(teacher.send("POST","/api/workspace/batches",Map.of("courseId",course,"name","Verification batch","schedule","Weekdays","startsOn","2026-10-01","endsOn","2027-01-01")));
        assertEquals(200,teacher.send("PUT","/api/workspace/batches/"+batch+"/members",Map.of("studentIds",List.of(studentId))).statusCode());
        String session=created(teacher.send("POST","/api/workspace/sessions",Map.of("courseId",course,"batchId",batch,"title","Verification live class","startsAt","2026-10-22T12:00:00Z","durationMinutes",60,"meetingUrl","https://meet.example.com/verification","status","SCHEDULED")));
        assertEquals(1,rows(student.send("GET","/api/workspace/sessions",null)).size());
        assertEquals(200,teacher.send("POST","/api/workspace/attendance",Map.of("sessionId",session,"studentId",studentId,"status","PRESENT")).statusCode());
        String notes=created(teacher.upload(course,null,"notes.pdf","%PDF-1.4\nVerification notes"));
        created(teacher.send("POST","/api/workspace/resources",Map.of("courseId",course,"title","Verification notes","fileId",notes)));
        assertEquals(200,student.send("GET","/api/workspace/files/"+notes,null).statusCode());
        String assignment=created(teacher.send("POST","/api/workspace/assignments",Map.of("courseId",course,"title","Verification assignment","description","Submit solution","dueAt","2027-01-01T12:00:00Z")));
        String solution=created(student.upload(course,assignment,"solution.txt","Verification solution"));
        String submission=created(student.send("POST","/api/workspace/submissions",Map.of("assignmentId",assignment,"fileId",solution,"note","Verification submission")));
        assertEquals(200,teacher.send("PUT","/api/workspace/submissions/"+submission+"/grade",Map.of("grade",90,"feedback","Verified")).statusCode());
        String lesson=created(teacher.send("POST","/api/workspace/learning/lessons",Map.of("courseId",course,"title","Verification lesson","body","Study the lesson","position",0,"published",true)));
        assertEquals(200,student.send("POST","/api/workspace/learning/lessons/"+lesson+"/complete",null).statusCode());
        String quiz=created(teacher.send("POST","/api/workspace/learning/quizzes",Map.of("courseId",course,"title","Verification quiz","passMark",60,"maxAttempts",2,"published",true,"questions",List.of(Map.of("prompt","Select correct","options",List.of("Correct","Incorrect"),"answerIndex",0)))));
        assertEquals(200,student.send("POST","/api/workspace/learning/quizzes/"+quiz+"/attempts",Map.of("answers",List.of(0))).statusCode());
        assertEquals(true,rows(student.send("GET","/api/workspace/learning/progress",null)).getFirst().get("eligible"));
        String certificate=created(admin.send("POST","/api/workspace/learning/certificates",Map.of("studentId",studentId,"courseId",course)));
        assertEquals(certificate,rows(student.send("GET","/api/workspace/learning/certificates",null)).getFirst().get("id").toString());
        var profile=Map.of("name","Updated Workflow Student","phone","9000000000","bio","ProfilePrivacySentinel","specialisation","");
        var saved=student.send("PUT","/api/workspace/profile",profile);assertEquals(200,saved.statusCode(),saved.body());assertEquals(studentId,obj(saved).get("id"));assertEquals("STUDENT",obj(saved).get("role"));assertFalse(saved.body().contains("password"));
        assertEquals("Updated Workflow Student",obj(student.send("GET","/api/auth/me",null)).get("name"));
        Browser secondSession=new Browser();secondSession.login("student@workflow.example");
        assertEquals("ProfilePrivacySentinel",obj(secondSession.send("GET","/api/workspace/profile",null)).get("bio"));
        var forged=new HashMap<String,Object>(profile);forged.put("id",trainer);assertEquals(400,student.send("PUT","/api/workspace/profile",forged).statusCode());
        forged.remove("id");forged.put("role","ADMIN");assertEquals(400,student.send("PUT","/api/workspace/profile",forged).statusCode());
        assertEquals("Workflow Trainer",obj(teacher.send("GET","/api/workspace/profile",null)).get("name"));
        assertEquals(403,student.send("GET","/api/admin/activity",null).statusCode());
        assertEquals(403,teacher.send("GET","/api/admin/activity",null).statusCode());
        var events=admin.send("GET","/api/admin/activity?search=profile",null);assertEquals(200,events.statusCode(),events.body());assertTrue(((Number)obj(events).get("total")).intValue()>0);assertTrue(events.body().contains("/api/workspace/profile"));assertFalse(events.body().contains("ProfilePrivacySentinel"));assertFalse(events.body().contains(PASSWORD));
        assertEquals(400,admin.send("GET","/api/admin/activity?size=500",null).statusCode());
        assertEquals(405,admin.send("DELETE","/api/admin/activity",null).statusCode());
        if(postgres())assertEquals(schema(),db.queryForObject("SELECT current_schema()",String.class));
    }
}
