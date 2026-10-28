package com.xpertsedge.lms.learning;

import com.xpertsedge.lms.domain.*;
import com.xpertsedge.lms.common.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import java.time.*;

@Service
public class CourseAccess {
    private final CourseRepository courses;
    private final EnrolmentRepository enrolments;
    private final Clock clock;
    public CourseAccess(CourseRepository courses,EnrolmentRepository enrolments,Clock clock){this.courses=courses;this.enrolments=enrolments;this.clock=clock;}
    public boolean enrolled(AppUser user,String course){return user.isEnabled()&&user.getRole()==Role.STUDENT&&courses.findById(course).map(Course::isPublished).orElse(false)&&enrolments.findByStudentIdAndCourseId(user.getId(),course).map(e->e.activeOn(LocalDate.now(clock.withZone(ZoneId.of("Asia/Kolkata"))))).orElse(false);}
    public boolean read(AppUser user,String course){return user.isEnabled()&&courses.findById(course).map(c->switch(user.getRole()){case ADMIN->true;case TRAINER->user.getId().equals(c.getTrainerId());case STUDENT->enrolled(user,course);}).orElse(false);}
    public void require(boolean condition){if(!condition)throw new ApiException(HttpStatus.FORBIDDEN,"You do not have access to this record.");}
    public void teach(AppUser user,String course){require(user.getRole()!=Role.STUDENT&&read(user,course));}
}
