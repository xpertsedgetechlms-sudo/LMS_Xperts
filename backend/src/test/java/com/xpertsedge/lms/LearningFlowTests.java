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

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties="spring.datasource.url=jdbc:h2:mem:learning-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
@ActiveProfiles("test")
class LearningFlowTests {
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
    @Test void assessmentsProgressAndCertificates()throws Exception{
        identities.create("Manager","manager@learning.example",PASSWORD,Role.ADMIN);
        AppUser t=identities.create("Trainer","trainer@learning.example",PASSWORD,Role.TRAINER);
        AppUser s=identities.create("Student","student@learning.example",PASSWORD,Role.STUDENT);
        identities.create("Other Student","other@learning.example",PASSWORD,Role.STUDENT);
        Browser admin=new Browser();admin.login("manager@learning.example");
        Browser teacher=new Browser();teacher.login("trainer@learning.example");
        Browser student=new Browser();student.login("student@learning.example");
        Browser outsider=new Browser();outsider.login("other@learning.example");
        created(admin.send("POST","/api/admin/courses",Map.of("id","learning","name","Learning course","category","Development","description","Assessment flow","published",true,"trainerId",t.getId())));
        created(admin.send("POST","/api/admin/enrolments",Map.of("studentId",s.getId(),"courseId","learning","status","ACTIVE")));
        String base="/api/workspace/learning";
        Map<String,Object> lesson=new HashMap<>(Map.of("courseId","learning","title","Fundamentals","body","Read and practise.","position",0,"published",false));
        assertEquals(403,student.send("POST",base+"/lessons",lesson).statusCode());
        String lessonId=created(teacher.send("POST",base+"/lessons",lesson));
        assertTrue(rows(student.send("GET",base+"/lessons",null)).isEmpty());
        assertEquals(403,student.send("POST",base+"/lessons/"+lessonId+"/complete",null).statusCode());
        lesson.put("published",true);assertEquals(200,teacher.send("PUT",base+"/lessons/"+lessonId,lesson).statusCode());
        assertEquals(1,rows(student.send("GET",base+"/lessons",null)).size());
        assertTrue(rows(outsider.send("GET",base+"/lessons",null)).isEmpty());
        assertEquals(200,student.send("POST",base+"/lessons/"+lessonId+"/complete",null).statusCode());
        assertEquals(200,student.send("POST",base+"/lessons/"+lessonId+"/complete",null).statusCode());
        assertEquals(1,((Number)rows(student.send("GET",base+"/progress",null)).getFirst().get("completed")).intValue());
        var issue=Map.of("studentId",s.getId(),"courseId","learning");
        assertEquals(400,admin.send("POST",base+"/certificates",issue).statusCode());
        Map<String,Object> quiz=new HashMap<>(Map.of("courseId","learning","title","Knowledge check","passMark",60,"maxAttempts",2,"published",true,"questions",List.of(Map.of("prompt","Select the answer","options",List.of("Incorrect","Correct"),"answerIndex",1))));
        assertEquals(403,student.send("POST",base+"/quizzes",quiz).statusCode());
        String quizId=created(teacher.send("POST",base+"/quizzes",quiz));
        var published=student.send("GET",base+"/quizzes",null);assertEquals(200,published.statusCode());assertFalse(published.body().contains("answerIndex"));assertFalse(published.body().contains("answer_index"));
        assertTrue(rows(outsider.send("GET",base+"/quizzes",null)).isEmpty());
        assertEquals(400,student.send("POST",base+"/quizzes/"+quizId+"/attempts",Map.of("answers",List.of(99))).statusCode());
        assertEquals(403,outsider.send("POST",base+"/quizzes/"+quizId+"/attempts",Map.of("answers",List.of(1))).statusCode());
        var failed=student.send("POST",base+"/quizzes/"+quizId+"/attempts",Map.of("answers",List.of(0)));assertEquals(200,failed.statusCode());assertEquals(false,obj(failed).get("passed"));
        var passed=student.send("POST",base+"/quizzes/"+quizId+"/attempts",Map.of("answers",List.of(1)));assertEquals(200,passed.statusCode());assertEquals(100,((Number)obj(passed).get("score")).intValue());
        assertEquals(409,student.send("POST",base+"/quizzes/"+quizId+"/attempts",Map.of("answers",List.of(1))).statusCode());
        assertEquals(400,teacher.send("PUT",base+"/quizzes/"+quizId,quiz).statusCode());
        assertEquals(200,teacher.send("PUT",base+"/quizzes/"+quizId+"/visibility",Map.of("published",false)).statusCode());
        assertTrue(rows(student.send("GET",base+"/quizzes",null)).isEmpty());
        assertEquals(200,teacher.send("PUT",base+"/quizzes/"+quizId+"/visibility",Map.of("published",true)).statusCode());
        assertTrue(rows(outsider.send("GET",base+"/attempts",null)).isEmpty());
        assertEquals(2,rows(student.send("GET",base+"/attempts",null)).size());
        assertEquals(true,rows(student.send("GET",base+"/progress",null)).getFirst().get("eligible"));
        UUID assignment=UUID.randomUUID();
        db.update("INSERT INTO teaching_assignments(id,course_id,title,description,due_at) VALUES(?,?,?,?,?)",assignment,"learning","Practice","Complete task",OffsetDateTime.now());
        assertEquals(false,rows(student.send("GET",base+"/progress",null)).getFirst().get("eligible"));
        assertEquals(400,admin.send("POST",base+"/certificates",issue).statusCode());
        String file=created(student.upload("learning",assignment.toString(),"work.txt","completed work"));
        String submission=created(student.send("POST","/api/workspace/submissions",Map.of("assignmentId",assignment,"fileId",file,"note","Ready")));
        assertEquals(200,teacher.send("PUT","/api/workspace/submissions/"+submission+"/grade",Map.of("grade",80,"feedback","Passed")).statusCode());
        assertEquals(403,student.send("POST",base+"/certificates",issue).statusCode());
        String certificate=created(admin.send("POST",base+"/certificates",issue));
        assertEquals(409,admin.send("POST",base+"/certificates",issue).statusCode());
        assertEquals(1,rows(student.send("GET",base+"/certificates",null)).size());
        assertTrue(rows(outsider.send("GET",base+"/certificates",null)).isEmpty());
        var downloaded=student.send("GET",base+"/certificates/"+certificate+"/pdf",null);
        assertEquals(200,downloaded.statusCode());assertEquals("application/pdf",downloaded.headers().firstValue("Content-Type").orElseThrow());assertTrue(downloaded.body().startsWith("%PDF-"));
        assertEquals(403,outsider.send("GET",base+"/certificates/"+certificate+"/pdf",null).statusCode());
        assertEquals(401,new Browser().send("GET",base+"/certificates/"+certificate+"/pdf",null).statusCode());
        assertEquals(403,student.send("PUT",base+"/certificates/"+certificate,Map.of("revoked",false)).statusCode());
        assertEquals(200,admin.send("PUT",base+"/certificates/"+certificate,Map.of("revoked",true)).statusCode());
        assertEquals(true,rows(student.send("GET",base+"/certificates",null)).getFirst().get("revoked"));
        assertEquals(409,student.send("GET",base+"/certificates/"+certificate+"/pdf",null).statusCode());
    }
}
