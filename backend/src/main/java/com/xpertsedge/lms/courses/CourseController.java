package com.xpertsedge.lms.courses;

import com.xpertsedge.lms.auth.IdentityService;
import com.xpertsedge.lms.common.ApiException;
import com.xpertsedge.lms.domain.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@RestController
public class CourseController {
    private final CourseRepository courses;
    private final UserRepository users;
    private final EnrolmentRepository enrolments;
    private final IdentityService identities;
    private final Clock clock;
    public CourseController(CourseRepository courses,UserRepository users,EnrolmentRepository enrolments,IdentityService identities,Clock clock){this.courses=courses;this.users=users;this.enrolments=enrolments;this.identities=identities;this.clock=clock;}
    public record CourseView(String id,String name,String category,String description,BigDecimal price,boolean published,UUID trainerId,String duration,String level){
        static CourseView of(Course c){return new CourseView(c.getId(),c.getName(),c.getCategory(),c.getDescription(),c.getPrice(),c.isPublished(),c.getTrainerId(),c.getDuration(),c.getLevel());}
    }
    public record CourseRequest(@NotBlank @Pattern(regexp="[a-z0-9-]{1,60}")String id,@NotBlank @Size(max=150)String name,@NotBlank @Size(max=100)String category,@NotBlank @Size(max=2000)String description,@DecimalMin("0.00") @Digits(integer=10,fraction=2)BigDecimal price,boolean published,UUID trainerId,@Size(max=100)String duration,@Size(max=50)String level){}
    @GetMapping("/api/courses") public List<CourseView> catalogue(){return courses.findByPublishedTrueOrderByNameAsc().stream().map(CourseView::of).toList();}
    @GetMapping("/api/admin/courses") public List<CourseView> all(Authentication auth){identities.current(auth);return courses.findAll().stream().map(CourseView::of).toList();}
    @PostMapping("/api/admin/courses") @ResponseStatus(HttpStatus.CREATED) @Transactional
    public CourseView create(@Valid @RequestBody CourseRequest r,Authentication auth){
        identities.current(auth);
        if(courses.existsById(r.id()))throw new ApiException(HttpStatus.CONFLICT,"Course ID already exists.");
        if(r.trainerId()!=null){AppUser trainer=users.findById(r.trainerId()).orElseThrow(()->new ApiException(HttpStatus.BAD_REQUEST,"Trainer not found."));if(trainer.getRole()!=Role.TRAINER||!trainer.isEnabled())throw new ApiException(HttpStatus.BAD_REQUEST,"Assign an active trainer account.");}
        return CourseView.of(courses.saveAndFlush(new Course(r.id(),r.name().strip(),r.category().strip(),r.description().strip(),r.price(),r.published(),r.trainerId(),r.duration(),r.level())));
    }
    @PutMapping("/api/admin/courses/{id}") @Transactional
    public CourseView update(@PathVariable String id,@Valid @RequestBody CourseRequest r,Authentication auth){
        identities.current(auth);
        if(!id.equals(r.id()))throw new ApiException(HttpStatus.BAD_REQUEST,"Course ID cannot be changed.");
        Course c=courses.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Course not found."));
        if(r.trainerId()!=null){AppUser t=users.findById(r.trainerId()).orElseThrow(()->new ApiException(HttpStatus.BAD_REQUEST,"Trainer not found."));if(t.getRole()!=Role.TRAINER||!t.isEnabled())throw new ApiException(HttpStatus.BAD_REQUEST,"Choose an active trainer.");}
        c.update(r.name().strip(),r.category().strip(),r.description().strip(),r.price(),r.published(),r.trainerId(),r.duration(),r.level());
        return CourseView.of(courses.saveAndFlush(c));
    }
    @GetMapping("/api/trainer/courses") public List<CourseView> assigned(Authentication auth){return courses.findByTrainerIdOrderByNameAsc(identities.current(auth).getId()).stream().map(CourseView::of).toList();}
    @GetMapping("/api/courses/{id}/access") public Map<String,Object> access(@PathVariable String id,Authentication auth){
        AppUser user=identities.current(auth);
        Course course=courses.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Course not found."));
        boolean allowed=switch(user.getRole()){
            case ADMIN -> true;
            case TRAINER -> user.getId().equals(course.getTrainerId());
            case STUDENT -> course.isPublished()&&enrolments.findByStudentIdAndCourseId(user.getId(),id).map(e->e.activeOn(LocalDate.now(clock.withZone(ZoneId.of("Asia/Kolkata"))))).orElse(false);
        };
        if(!allowed)throw new ApiException(HttpStatus.FORBIDDEN,"Active course access is required.");
        return Map.of("courseId",id,"allowed",true);
    }
}
