package com.xpertsedge.lms.domain;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface EnrolmentRepository extends JpaRepository<Enrolment,UUID> {
    Optional<Enrolment> findByStudentIdAndCourseId(UUID studentId,String courseId);
    List<Enrolment> findByStudentIdOrderByCreatedAtDesc(UUID studentId);
}
