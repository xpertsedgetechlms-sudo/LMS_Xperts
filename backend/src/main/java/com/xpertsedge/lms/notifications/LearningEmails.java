package com.xpertsedge.lms.notifications;

import com.xpertsedge.lms.auth.RecoveryMail;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.sql.Timestamp;
import java.util.*;
import java.security.*;
import java.nio.charset.StandardCharsets;

@Configuration @EnableScheduling
class LearningEmailScheduling {}

@Service
public class LearningEmails {
    private final JdbcTemplate db;private final RecoveryMail mail;private final Clock clock;private final boolean enabled;
    public LearningEmails(JdbcTemplate db,RecoveryMail mail,Clock clock,@Value("${lms.notifications.email-enabled:false}")boolean enabled){this.db=db;this.mail=mail;this.clock=clock;this.enabled=enabled;}
    public boolean enabled(){return enabled&&mail.enabled();}
    private Timestamp now(){return Timestamp.from(clock.instant());}
    private LocalDate today(){return LocalDate.now(clock.withZone(ZoneId.of("Asia/Kolkata")));}
    private static String fingerprint(Object... values){StringBuilder value=new StringBuilder();for(Object part:values){String text=String.valueOf(part);value.append(text.length()).append(':').append(text);}try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.toString().getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
    private static String date(Object value){return value instanceof OffsetDateTime t?t.atZoneSameInstant(ZoneId.of("Asia/Kolkata")).format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a 'IST'",Locale.ENGLISH)):value.toString();}
    private String course(String id){return db.queryForObject("SELECT name FROM courses WHERE id=?",String.class,id);}
    private List<Map<String,Object>> recipients(String course,UUID batch){
        String sql="SELECT u.id,u.email FROM app_users u JOIN enrolments e ON e.student_id=u.id JOIN courses c ON c.id=e.course_id WHERE u.enabled=true AND u.role='STUDENT' AND c.published=true AND e.course_id=? AND e.status='ACTIVE' AND (e.expires_at IS NULL OR e.expires_at>=?)";
        return batch==null?db.queryForList(sql,course,today()):db.queryForList(sql+" AND EXISTS (SELECT 1 FROM batch_members m WHERE m.student_id=u.id AND m.batch_id=?)",course,today(),batch);
    }
    private void enqueue(String key,String hash,String kind,String course,UUID batch,String subject,String body,List<Map<String,Object>> people){
        var old=db.queryForList("SELECT fingerprint FROM learning_email_state WHERE event_key=?",key);
        if(!old.isEmpty()&&old.get(0).get("fingerprint").equals(hash))return; // Repeated identical Save is not another mail.
        db.update("UPDATE learning_email_outbox SET status='SKIPPED',last_error='Superseded by a newer update' WHERE event_key=? AND status='PENDING'",key);
        if(old.isEmpty())db.update("INSERT INTO learning_email_state(event_key,fingerprint) VALUES(?,?)",key,hash);
        else db.update("UPDATE learning_email_state SET fingerprint=? WHERE event_key=?",hash,key);
        Timestamp time=now();
        for(var person:people)db.update("INSERT INTO learning_email_outbox(id,event_key,fingerprint,kind,course_id,batch_id,student_id,subject,body,status,created_at,next_attempt_at) VALUES(?,?,?,?,?,?,?,?,?,'PENDING',?,?)",UUID.randomUUID(),key,hash,kind,course,batch,person.get("id"),subject,body,time,time);
    }
    // Called inside the same business transaction: failed saves never send emails.
    @Transactional(propagation=Propagation.MANDATORY)
    public void enrolment(UUID id){
        var row=db.queryForMap("SELECT * FROM enrolments WHERE id=? FOR UPDATE",id);String course=row.get("course_id").toString();
        String hash=fingerprint(row.get("status"),row.get("expires_at"));
        var people=recipients(course,null).stream().filter(p->p.get("id").equals(row.get("student_id"))).toList();
        enqueue("ENROLMENT:"+id,hash,"ENROLMENT",course,null,"Your course access is active","Your enrolment for "+course(course)+" is active. Sign in to see your learning materials.",people);
    }
    @Transactional(propagation=Propagation.MANDATORY)
    public void assignment(UUID id){
        var row=db.queryForMap("SELECT * FROM teaching_assignments WHERE id=? FOR UPDATE",id);String course=row.get("course_id").toString();
        String hash=fingerprint(row.get("title"),row.get("description"),row.get("due_at"));
        enqueue("ASSIGNMENT:"+id,hash,"ASSIGNMENT",course,null,"Assignment: "+row.get("title"),"An assignment was published or updated for "+course(course)+".\n\n"+row.get("title")+"\nDue: "+date(row.get("due_at"))+"\nSign in to read the instructions and submit your work.",recipients(course,null));
    }
    @Transactional(propagation=Propagation.MANDATORY)
    public void session(UUID id){
        var row=db.queryForMap("SELECT * FROM live_sessions WHERE id=? FOR UPDATE",id);String course=row.get("course_id").toString();UUID batch=(UUID)row.get("batch_id");
        String hash=fingerprint(row.get("title"),row.get("starts_at"),row.get("duration_minutes"),row.get("meeting_url"),row.get("status"));
        enqueue("CLASS:"+id,hash,"LIVE_CLASS",course,batch,"Live class: "+row.get("title"),"Live class details for "+course(course)+".\n\n"+row.get("title")+"\nStatus: "+row.get("status")+"\nStarts: "+date(row.get("starts_at"))+"\nDuration: "+row.get("duration_minutes")+" minutes\nSign in for the latest class details and meeting link.",recipients(course,batch));
    }
    @Scheduled(fixedDelayString="${lms.notifications.poll-ms:30000}",initialDelayString="${lms.notifications.initial-delay-ms:30000}")
    public void deliver(){
        if(!enabled())return;
        // Recover work interrupted by a process crash. SMTP is at-least-once, not exactly-once.
        db.update("UPDATE learning_email_outbox SET status='PENDING',locked_at=NULL WHERE status='SENDING' AND locked_at<?",Timestamp.from(clock.instant().minusSeconds(900)));
        db.update("UPDATE learning_email_outbox SET status='SKIPPED',last_error='Notification is older than 7 days' WHERE status='PENDING' AND created_at<?",Timestamp.from(clock.instant().minusSeconds(7*86400L)));
        var rows=db.queryForList("SELECT * FROM learning_email_outbox WHERE status='PENDING' AND next_attempt_at<=? ORDER BY created_at LIMIT 25",now());
        for(var row:rows){
            Object id=row.get("id");
            if(db.update("UPDATE learning_email_outbox SET status='SENDING',attempts=attempts+1,locked_at=? WHERE id=? AND status='PENDING'",now(),id)!=1)continue;
            String course=row.get("course_id").toString();UUID batch=(UUID)row.get("batch_id");
            var person=recipients(course,batch).stream().filter(p->p.get("id").equals(row.get("student_id"))).findFirst();
            var current=db.queryForList("SELECT fingerprint FROM learning_email_state WHERE event_key=?",row.get("event_key"));
            if(person.isEmpty()||current.isEmpty()||!current.get(0).get("fingerprint").equals(row.get("fingerprint"))){db.update("UPDATE learning_email_outbox SET status='SKIPPED',last_error='Access changed or event superseded' WHERE id=?",id);continue;}
            try{
                mail.notification(person.get().get("email").toString(),row.get("subject").toString(),row.get("body").toString());
                db.update("UPDATE learning_email_outbox SET status='SENT',sent_at=?,last_error=NULL,locked_at=NULL WHERE id=?",now(),id);
            }catch(Exception e){
                int attempts=((Number)row.get("attempts")).intValue()+1;
                db.update("UPDATE learning_email_outbox SET status=?,last_error='SMTP delivery failed; check server mail configuration',next_attempt_at=?,locked_at=NULL WHERE id=?",attempts>=5?"FAILED":"PENDING",Timestamp.from(clock.instant().plusSeconds(60L*attempts)),id);
            }
        }
    }
}
