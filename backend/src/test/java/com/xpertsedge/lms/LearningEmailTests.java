package com.xpertsedge.lms;

import com.xpertsedge.lms.auth.*;
import com.xpertsedge.lms.domain.Role;
import com.xpertsedge.lms.notifications.LearningEmails;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;
import java.net.*;
import java.net.http.*;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"spring.datasource.url=jdbc:h2:mem:email-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1","lms.notifications.email-enabled=true","lms.notifications.initial-delay-ms=3600000"})
@ActiveProfiles("test")
class LearningEmailTests {
    @Value("${local.server.port}")int port;
    @Autowired IdentityService identities;@Autowired JdbcTemplate db;@Autowired LearningEmails emails;@Autowired TransactionTemplate tx;
    @MockitoBean RecoveryMail mail;
    final JsonMapper json=JsonMapper.builder().build();
    final String password="EmailWorkflowPassword42!";
    class Browser {
        final HttpClient client=HttpClient.newBuilder().cookieHandler(new CookieManager(null,CookiePolicy.ACCEPT_ALL)).build();String csrf;
        HttpResponse<String> send(String method,String path,Object body)throws Exception{
            if(!method.equals("GET"))csrf=(String)json.readValue(send("GET","/api/auth/csrf",null).body(),Map.class).get("token");
            var builder=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).timeout(Duration.ofSeconds(20));
            if(csrf!=null)builder.header("X-CSRF-TOKEN",csrf);if(body!=null)builder.header("Content-Type","application/json");
            return client.send(builder.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(),HttpResponse.BodyHandlers.ofString());
        }
        void login(String email)throws Exception{assertEquals(200,send("POST","/api/auth/login",Map.of("email",email,"password",password)).statusCode());}
        UUID create(String path,Object body)throws Exception{var r=send("POST",path,body);assertTrue(r.statusCode()==200||r.statusCode()==201,r.body());return UUID.fromString((String)json.readValue(r.body(),Map.class).get("id"));}
    }
    int count(String status){return db.queryForObject("SELECT count(*) FROM learning_email_outbox WHERE status=?",Integer.class,status);}
    Map<String,Object> assignment(String title){return Map.of("courseId","dev","title",title,"description","Complete the coding task","dueAt","2027-01-01T10:00:00+05:30");}
    @Test void transactionalDeliveryScopesDeduplicatesRetriesAndChecksAccess()throws Exception{
        identities.create("Email Admin","admin@email.example",password,Role.ADMIN);
        var a=identities.create("Student A","a@email.example",password,Role.STUDENT);var b=identities.create("Student B","b@email.example",password,Role.STUDENT);
        Browser admin=new Browser();admin.login("admin@email.example");
        UUID enrolA=admin.create("/api/admin/enrolments",Map.of("studentId",a.getId(),"courseId","dev","status","ACTIVE"));
        UUID enrolB=admin.create("/api/admin/enrolments",Map.of("studentId",b.getId(),"courseId","dev","status","ACTIVE"));
        assertEquals(2,count("PENDING"));emails.deliver();verify(mail,never()).notification(anyString(),anyString(),anyString()); // SMTP disabled leaves durable records queued.
        when(mail.enabled()).thenReturn(true);emails.deliver();assertEquals(2,count("SENT"));verify(mail).notification(eq("a@email.example"),contains("access"),anyString());
        assertEquals(200,admin.send("PUT","/api/admin/enrolments/"+enrolA,Map.of("status","ACTIVE")).statusCode());assertEquals(2,count("SENT"));assertEquals(0,count("PENDING"));
        UUID assignment=admin.create("/api/workspace/assignments",assignment("First assignment"));assertEquals(2,count("PENDING"));
        assertEquals(200,admin.send("PUT","/api/workspace/assignments/"+assignment,assignment("First assignment")).statusCode());assertEquals(2,count("PENDING"));
        assertEquals(200,admin.send("PUT","/api/workspace/assignments/"+assignment,assignment("Updated assignment")).statusCode());assertEquals(2,count("SKIPPED"));assertEquals(2,count("PENDING"));
        UUID batch=admin.create("/api/workspace/batches",Map.of("courseId","dev","name","Email batch","schedule","Weekdays","startsOn","2026-11-01","endsOn","2027-02-01"));
        assertEquals(200,admin.send("PUT","/api/workspace/batches/"+batch+"/members",Map.of("studentIds",List.of(a.getId()))).statusCode());
        var session=new HashMap<String,Object>(Map.of("courseId","dev","batchId",batch,"title","Email live class","startsAt","2027-01-01T10:00:00+05:30","durationMinutes",60,"meetingUrl","https://meet.example.com/private","status","SCHEDULED"));
        UUID sessionId=admin.create("/api/workspace/sessions",session);
        assertEquals(1,db.queryForObject("SELECT count(*) FROM learning_email_outbox WHERE kind='LIVE_CLASS'",Integer.class));
        assertEquals(a.getId(),db.queryForObject("SELECT student_id FROM learning_email_outbox WHERE kind='LIVE_CLASS'",UUID.class));
        emails.deliver();assertEquals(0,count("PENDING"));
        session.put("status","CANCELLED");assertEquals(200,admin.send("PUT","/api/workspace/sessions/"+sessionId,session).statusCode());
        assertTrue(db.queryForObject("SELECT body FROM learning_email_outbox WHERE status='PENDING'",String.class).contains("CANCELLED"));
        assertFalse(db.queryForObject("SELECT body FROM learning_email_outbox WHERE status='PENDING'",String.class).contains("https://meet.example.com/private"));
        doThrow(new RuntimeException("Provider detail must not be stored")).when(mail).notification(anyString(),anyString(),anyString());
        for(int i=0;i<5;i++){db.update("UPDATE learning_email_outbox SET next_attempt_at=? WHERE status='PENDING'",java.sql.Timestamp.from(Instant.now().minusSeconds(1)));emails.deliver();}
        assertEquals(1,count("FAILED"));UUID failed=db.queryForObject("SELECT id FROM learning_email_outbox WHERE status='FAILED'",UUID.class);
        assertFalse(db.queryForObject("SELECT last_error FROM learning_email_outbox WHERE id=?",String.class,failed).contains("Provider detail"));
        doNothing().when(mail).notification(anyString(),anyString(),anyString());assertEquals(200,admin.send("POST","/api/admin/email-notifications/"+failed+"/retry",null).statusCode());emails.deliver();assertEquals(0,count("FAILED"));
        admin.send("PUT","/api/workspace/assignments/"+assignment,assignment("Access check assignment"));
        admin.send("PUT","/api/admin/enrolments/"+enrolB,Map.of("status","REVOKED"));emails.deliver();
        assertEquals("SKIPPED",db.queryForObject("SELECT status FROM learning_email_outbox WHERE subject='Assignment: Access check assignment' AND student_id=?",String.class,b.getId()));
        int before=db.queryForObject("SELECT count(*) FROM learning_email_outbox",Integer.class);
        UUID rolledBack=UUID.randomUUID();assertThrows(IllegalStateException.class,()->tx.executeWithoutResult(status->{db.update("INSERT INTO teaching_assignments(id,course_id,title,description,due_at) VALUES(?,'dev','Rollback','Test',?)",rolledBack,java.sql.Timestamp.from(Instant.now()));emails.assignment(rolledBack);throw new IllegalStateException("rollback");}));
        assertEquals(before,db.queryForObject("SELECT count(*) FROM learning_email_outbox",Integer.class));
        Browser student=new Browser();student.login("a@email.example");assertEquals(403,student.send("GET","/api/admin/email-notifications",null).statusCode());assertEquals(200,admin.send("GET","/api/admin/email-notifications",null).statusCode());
    }
}
