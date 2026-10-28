package com.xpertsedge.lms.learning;

import com.xpertsedge.lms.auth.IdentityService;
import com.xpertsedge.lms.common.ApiException;
import com.xpertsedge.lms.domain.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import java.util.*;
import java.time.*;

@RestController
public class OperationsController {
    private final JdbcTemplate db;
    private final IdentityService identities;
    private final CourseAccess access;
    private final CourseRepository courses;
    private final Clock clock;
    public OperationsController(JdbcTemplate db,IdentityService identities,CourseAccess access,CourseRepository courses,Clock clock){this.db=db;this.identities=identities;this.access=access;this.courses=courses;this.clock=clock;}
    @GetMapping("/api/public/settings") public Map<String,String> settings(){Map<String,String> result=new LinkedHashMap<>();db.queryForList("SELECT * FROM institute_settings").forEach(r->result.put(r.get("setting_key").toString(),r.get("setting_value").toString()));return result;}
    public record SettingsInput(@NotBlank @Size(max=100)String name,@NotBlank @Email @Size(max=254)String email,@NotBlank @Pattern(regexp="[+0-9 ()-]{7,30}")String phone,@NotNull @Size(max=1000)String address){}
    @PutMapping("/api/admin/settings") @Transactional public Map<String,String> saveSettings(@Valid @RequestBody SettingsInput r,Authentication auth){access.require(identities.current(auth).getRole()==Role.ADMIN);for(var entry:Map.of("name",r.name().strip(),"email",r.email().strip(),"phone",r.phone().strip(),"address",r.address().strip()).entrySet())db.update("UPDATE institute_settings SET setting_value=? WHERE setting_key=?",entry.getValue(),entry.getKey());return settings();}
    public record AnnouncementInput(@Size(max=60)String courseId,@NotBlank @Size(max=150)String title,@NotBlank @Size(max=4000)String body){}
    private List<Map<String,Object>> visibleAnnouncements(AppUser u){return db.queryForList("SELECT * FROM institute_announcements ORDER BY created_at DESC").stream().filter(r->r.get("course_id")==null||access.read(u,r.get("course_id").toString())).toList();}
    @GetMapping("/api/workspace/announcements") public List<?> announcements(Authentication auth){return visibleAnnouncements(identities.current(auth));}
    @PostMapping("/api/workspace/announcements") @Transactional public Map<String,Object> announce(@Valid @RequestBody AnnouncementInput r,Authentication auth){AppUser u=identities.current(auth);access.require(u.getRole()!=Role.STUDENT);if(r.courseId()==null)access.require(u.getRole()==Role.ADMIN);else access.teach(u,r.courseId());UUID id=UUID.randomUUID();db.update("INSERT INTO institute_announcements(id,course_id,title,body,created_by,created_at) VALUES(?,?,?,?,?,?)",id,r.courseId(),r.title().strip(),r.body().strip(),u.getId(),OffsetDateTime.now(clock));return Map.of("id",id);}
    @GetMapping("/api/workspace/reports") public Map<String,Object> report(Authentication auth){AppUser u=identities.current(auth);List<String> ids=courses.findAll().stream().filter(c->access.read(u,c.getId())).map(Course::getId).toList();var submissions=db.queryForList("SELECT s.id,s.student_id,s.grade,a.course_id FROM assignment_submissions s JOIN teaching_assignments a ON a.id=s.assignment_id").stream().filter(r->ids.contains(r.get("course_id").toString())&&(u.getRole()!=Role.STUDENT||u.getId().toString().equals(r.get("student_id").toString()))).toList();var attendance=db.queryForList("SELECT a.student_id,a.status,s.course_id FROM class_attendance a JOIN live_sessions s ON s.id=a.session_id").stream().filter(r->ids.contains(r.get("course_id").toString())&&(u.getRole()!=Role.STUDENT||u.getId().toString().equals(r.get("student_id").toString()))).toList();return Map.of("accessibleCourses",ids.size(),"submissions",submissions.size(),"awaitingGrade",submissions.stream().filter(r->r.get("grade")==null).count(),"graded",submissions.stream().filter(r->r.get("grade")!=null).count(),"attendanceRecords",attendance.size(),"presentOrLate",attendance.stream().filter(r->List.of("PRESENT","LATE").contains(r.get("status"))).count());}
    @GetMapping("/api/workspace/notifications") public List<Map<String,Object>> notifications(Authentication auth){AppUser u=identities.current(auth);List<Map<String,Object>> result=new ArrayList<>();for(var a:visibleAnnouncements(u).stream().limit(30).toList())result.add(new LinkedHashMap<>(Map.of("id","announcement-"+a.get("id"),"title",a.get("title"),"detail",a.get("body"),"page","Announcements")));if(u.getRole()!=Role.STUDENT){for(var row:db.queryForList("SELECT s.id,s.student_id,a.title,a.course_id FROM assignment_submissions s JOIN teaching_assignments a ON a.id=s.assignment_id WHERE s.grade IS NULL")){if(access.read(u,row.get("course_id").toString()))result.add(new LinkedHashMap<>(Map.of("id","submission-"+row.get("id"),"title","Submission awaiting grade","detail",row.get("title"),"page","Submissions")));}}else for(var row:db.queryForList("SELECT s.id,s.grade,s.student_id,a.title,a.course_id FROM assignment_submissions s JOIN teaching_assignments a ON a.id=s.assignment_id WHERE s.grade IS NOT NULL AND s.student_id=?",u.getId()))if(access.read(u,row.get("course_id").toString()))result.add(new LinkedHashMap<>(Map.of("id","grade-"+row.get("id"),"title","Assignment graded","detail",row.get("title")+" · "+row.get("grade")+"/100","page","Assignments")));var limited=result.stream().limit(50).toList();for(var row:limited)row.put("read",db.queryForObject("SELECT COUNT(*) FROM read_notifications WHERE user_id=? AND notification_id=?",Integer.class,u.getId(),row.get("id"))>0);return limited;}
    @PostMapping("/api/workspace/notifications/{id}/read") @Transactional public Map<String,Object> read(@PathVariable @Size(max=100)String id,Authentication auth){AppUser u=identities.current(auth);access.require(notifications(auth).stream().anyMatch(r->id.equals(r.get("id"))));if(db.queryForObject("SELECT COUNT(*) FROM read_notifications WHERE user_id=? AND notification_id=?",Integer.class,u.getId(),id)==0)db.update("INSERT INTO read_notifications(user_id,notification_id,read_at) VALUES(?,?,?)",u.getId(),id,OffsetDateTime.now(clock));return Map.of("saved",true);}
}
