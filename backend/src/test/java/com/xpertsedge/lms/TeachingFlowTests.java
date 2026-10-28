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

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties="spring.datasource.url=jdbc:h2:mem:teaching-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
@ActiveProfiles("test")
class TeachingFlowTests {
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
    @Test void completeTeachingAccessFlow()throws Exception{
        new BootstrapAdmin(identities,users,"manager@teaching.example",PASSWORD).run(new DefaultApplicationArguments());
        assertEquals(Role.ADMIN,users.findByEmail("manager@teaching.example").orElseThrow().getRole());
        new BootstrapAdmin(identities,users,"another@teaching.example",PASSWORD).run(new DefaultApplicationArguments());
        assertTrue(users.findByEmail("another@teaching.example").isEmpty());
        AppUser trainer=identities.create("Assigned Trainer","trainer@teaching.example",PASSWORD,Role.TRAINER);
        identities.create("Other Trainer","other-trainer@teaching.example",PASSWORD,Role.TRAINER);
        AppUser learner=identities.create("Learner One","learner@teaching.example",PASSWORD,Role.STUDENT);
        identities.create("Other Learner","other@teaching.example",PASSWORD,Role.STUDENT);
        Browser admin=new Browser();admin.login("manager@teaching.example");
        Browser teacher=new Browser();teacher.login("trainer@teaching.example");
        Browser otherTeacher=new Browser();otherTeacher.login("other-trainer@teaching.example");
        Browser student=new Browser();student.login("learner@teaching.example");
        Browser outsider=new Browser();outsider.login("other@teaching.example");
        Map<String,Object> course=new HashMap<>(Map.of("id","teaching","name","Teaching course","category","Development","description","Private teaching flow","published",true,"trainerId",trainer.getId()));
        assertEquals(201,admin.send("POST","/api/admin/courses",course).statusCode());
        course.put("description","Updated course content");assertEquals(200,admin.send("PUT","/api/admin/courses/teaching",course).statusCode());
        assertEquals(403,student.send("PUT","/api/admin/courses/teaching",course).statusCode());
        assertTrue(rows(student.send("GET","/api/workspace/courses",null)).isEmpty());
        String enrolment=created(admin.send("POST","/api/admin/enrolments",Map.of("studentId",learner.getId(),"courseId","teaching","status","ACTIVE")));
        assertEquals(1,rows(student.send("GET","/api/workspace/courses",null)).size());
        var batch=Map.of("courseId","teaching","name","Weekday","schedule","Mon 6pm","startsOn","2026-10-01","endsOn","2027-01-01");
        assertEquals(403,student.send("POST","/api/workspace/batches",batch).statusCode());
        assertEquals(403,otherTeacher.send("POST","/api/workspace/batches",batch).statusCode());
        String batchId=created(teacher.send("POST","/api/workspace/batches",batch));
        assertTrue(rows(student.send("GET","/api/workspace/batches",null)).isEmpty());
        assertEquals(200,teacher.send("PUT","/api/workspace/batches/"+batchId+"/members",Map.of("studentIds",List.of(learner.getId()))).statusCode());
        assertEquals(1,rows(student.send("GET","/api/workspace/batches",null)).size());
        assertEquals(200,teacher.send("PUT","/api/workspace/batches/"+batchId,batch).statusCode());
        Map<String,Object> session=new HashMap<>(Map.of("courseId","teaching","batchId",batchId,"title","Live class","startsAt","2026-10-22T12:00:00Z","durationMinutes",60,"meetingUrl","https://meet.example.com/class","status","SCHEDULED"));
        String sessionId=created(teacher.send("POST","/api/workspace/sessions",session));
        session.put("meetingUrl","javascript:alert(1)");assertEquals(400,teacher.send("PUT","/api/workspace/sessions/"+sessionId,session).statusCode());session.put("meetingUrl","https://meet.example.com/class");
        assertEquals(200,teacher.send("PUT","/api/workspace/sessions/"+sessionId,session).statusCode());
        assertEquals(1,rows(student.send("GET","/api/workspace/sessions",null)).size());
        assertTrue(rows(outsider.send("GET","/api/workspace/sessions",null)).isEmpty());
        var attendance=Map.of("sessionId",sessionId,"studentId",learner.getId(),"status","PRESENT");
        assertEquals(200,teacher.send("POST","/api/workspace/attendance",attendance).statusCode());
        assertEquals(403,student.send("POST","/api/workspace/attendance",attendance).statusCode());
        assertEquals(1,rows(student.send("GET","/api/workspace/attendance",null)).size());
        assertTrue(rows(outsider.send("GET","/api/workspace/attendance",null)).isEmpty());
        var assignment=Map.of("courseId","teaching","title","Build a page","description","Submit your solution","dueAt","2026-10-20T12:00:00Z");
        String assignmentId=created(teacher.send("POST","/api/workspace/assignments",assignment));
        assertEquals(200,teacher.send("PUT","/api/workspace/assignments/"+assignmentId,assignment).statusCode());
        assertTrue(rows(outsider.send("GET","/api/workspace/assignments",null)).isEmpty());
        assertEquals(400,teacher.upload("teaching",null,"fake.pdf","not a pdf").statusCode());
        assertEquals(400,teacher.upload("teaching",null,"unsafe.html","<html>bad</html>").statusCode());
        String material=created(teacher.upload("teaching",null,"notes.pdf","%PDF-1.4\nTeaching notes"));
        assertEquals(403,student.send("GET","/api/workspace/files/"+material,null).statusCode());
        created(teacher.send("POST","/api/workspace/resources",Map.of("courseId","teaching","title","Course notes","fileId",material)));
        assertTrue(student.send("GET","/api/workspace/files/"+material,null).body().startsWith("%PDF-"));
        assertEquals(403,outsider.send("GET","/api/workspace/files/"+material,null).statusCode());
        assertEquals(403,student.upload("teaching",null,"work.txt","solution").statusCode());
        String solution=created(student.upload("teaching",assignmentId,"work.txt","My assignment"));
        String submission=created(student.send("POST","/api/workspace/submissions",Map.of("assignmentId",assignmentId,"fileId",solution,"note","My solution")));
        assertEquals(1,rows(teacher.send("GET","/api/workspace/submissions",null)).size());
        assertTrue(rows(outsider.send("GET","/api/workspace/submissions",null)).isEmpty());
        assertEquals(403,outsider.send("GET","/api/workspace/files/"+solution,null).statusCode());
        assertEquals(403,otherTeacher.send("GET","/api/workspace/files/"+solution,null).statusCode());
        assertEquals(200,teacher.send("GET","/api/workspace/files/"+solution,null).statusCode());
        AppUser second=users.findByEmail("other@teaching.example").orElseThrow();
        created(admin.send("POST","/api/admin/enrolments",Map.of("studentId",second.getId(),"courseId","teaching","status","ACTIVE")));
        assertEquals(200,outsider.send("GET","/api/workspace/files/"+material,null).statusCode());
        assertEquals(403,outsider.send("GET","/api/workspace/files/"+solution,null).statusCode());
        assertTrue(rows(outsider.send("GET","/api/workspace/submissions",null)).isEmpty());
        assertTrue(rows(outsider.send("GET","/api/workspace/sessions",null)).isEmpty());
        assertEquals(403,outsider.send("POST","/api/workspace/submissions",Map.of("assignmentId",assignmentId,"fileId",solution,"note","stolen file")).statusCode());
        assertEquals(400,teacher.send("POST","/api/workspace/attendance",Map.of("sessionId",sessionId,"studentId",second.getId(),"status","PRESENT")).statusCode());

        assertEquals(403,student.send("PUT","/api/workspace/submissions/"+submission+"/grade",Map.of("grade",99,"feedback","bad")).statusCode());
        assertEquals(400,teacher.send("PUT","/api/workspace/submissions/"+submission+"/grade",Map.of("grade",101,"feedback","bad")).statusCode());
        assertEquals(200,teacher.send("PUT","/api/workspace/submissions/"+submission+"/grade",Map.of("grade",85,"feedback","Good work")).statusCode());
        assertEquals(1,rows(student.send("GET","/api/workspace/submissions/"+submission+"/history",null)).size());
        assertEquals(403,outsider.send("GET","/api/workspace/submissions/"+submission+"/history",null).statusCode());
        assertEquals(400,student.send("POST","/api/workspace/submissions",Map.of("assignmentId",assignmentId,"fileId",solution,"note","replace")).statusCode());
        assertEquals(200,admin.send("PUT","/api/admin/enrolments/"+enrolment,Map.of("status","REVOKED")).statusCode());
        assertTrue(rows(student.send("GET","/api/workspace/resources",null)).isEmpty());
        assertEquals(403,student.send("GET","/api/workspace/files/"+material,null).statusCode());
        assertEquals(403,student.send("GET","/api/workspace/files/"+solution,null).statusCode());
        assertEquals(200,admin.send("GET","/api/auth/me",null).statusCode());
    }
}
