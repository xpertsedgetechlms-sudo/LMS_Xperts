package com.xpertsedge.lms.domain;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface CourseRepository extends JpaRepository<Course,String> {
    List<Course> findByPublishedTrueOrderByNameAsc();
    List<Course> findByTrainerIdOrderByNameAsc(UUID trainerId);
}
