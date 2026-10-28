package com.xpertsedge.lms.domain;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface UserRepository extends JpaRepository<AppUser,UUID> {
    Optional<AppUser> findByEmail(String email);
    boolean existsByRole(Role role);
}
