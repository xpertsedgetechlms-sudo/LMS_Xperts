package com.xpertsedge.lms.enrolments;

import com.xpertsedge.lms.auth.IdentityService;
import com.xpertsedge.lms.common.ApiException;
import com.xpertsedge.lms.domain.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;

@RestController
public class EnrolmentController {
    private final EnrolmentRepository enrolments;
    private final UserRepository users;
    private final CourseRepository courses;
    private final IdentityService identities;
    private final Clock clock;
    private final com.xpertsedge.lms.notifications.LearningEmails emails;
    public EnrolmentController(EnrolmentRepository enrolments,UserRepository users,CourseRepository courses,IdentityService identities,Clock clock,com.xpertsedge.lms.notifications.LearningEmails emails){this.enrolments=enrolments;this.users=users;this.courses=courses;this.identities=identities;this.clock=clock;this.emails=emails;}
    public record CreateEnrolment(@NotNull UUID studentId,@NotBlank @Size(max=60)String courseId,@NotNull Enrolment.Status status,LocalDate expiresAt){}
    public record UpdateEnrolment(@NotNull Enrolment.Status status,LocalDate expiresAt){}
    public record EnrolmentView(UUID id,UUID studentId,String courseId,Enrolment.Status status,LocalDate expiresAt,boolean active){}
    private EnrolmentView view(Enrolment e){return new EnrolmentView(e.getId(),e.getStudentId(),e.getCourseId(),e.getStatus(),e.getExpiresAt(),e.activeOn(LocalDate.now(clock.withZone(ZoneId.of("Asia/Kolkata")))));}
    @GetMapping("/api/student/enrolments") public List<EnrolmentView> own(Authentication auth){
        return enrolments.findByStudentIdOrderByCreatedAtDesc(identities.current(auth).getId()).stream().map(this::view).toList();
    }
    @GetMapping("/api/admin/enrolments") public List<EnrolmentView> all(Authentication auth){identities.current(auth);return enrolments.findAll().stream().map(this::view).toList();}
    @PostMapping("/api/admin/enrolments") @ResponseStatus(HttpStatus.CREATED) @Transactional
    public EnrolmentView create(@Valid @RequestBody CreateEnrolment r,Authentication auth){
        identities.current(auth);
        AppUser student=users.findById(r.studentId()).orElseThrow(()->new ApiException(HttpStatus.BAD_REQUEST,"Student not found."));
        if(student.getRole()!=Role.STUDENT||!student.isEnabled())throw new ApiException(HttpStatus.BAD_REQUEST,"Choose an active student account.");
        if(!courses.existsById(r.courseId()))throw new ApiException(HttpStatus.BAD_REQUEST,"Course not found.");
        if(enrolments.findByStudentIdAndCourseId(r.studentId(),r.courseId()).isPresent())throw new ApiException(HttpStatus.CONFLICT,"Edit the existing enrolment instead.");
        Enrolment saved=enrolments.saveAndFlush(new Enrolment(r.studentId(),r.courseId(),r.status(),r.expiresAt()));emails.enrolment(saved.getId());return view(saved);
    }
    @PutMapping("/api/admin/enrolments/{id}") @Transactional
    public EnrolmentView update(@PathVariable UUID id,@Valid @RequestBody UpdateEnrolment r,Authentication auth){
        identities.current(auth);Enrolment e=enrolments.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Enrolment not found."));
        e.update(r.status(),r.expiresAt());enrolments.saveAndFlush(e);emails.enrolment(e.getId());return view(e);
    }
}
