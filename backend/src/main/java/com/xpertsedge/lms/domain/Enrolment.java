package com.xpertsedge.lms.domain;

import jakarta.persistence.*;
import java.time.*;
import java.util.UUID;

@Entity @Table(name="enrolments")
public class Enrolment {
    public enum Status { ACTIVE,PENDING,REVOKED }
    @Id private UUID id;
    @Column(name="student_id",nullable=false) private UUID studentId;
    @Column(name="course_id",nullable=false,length=60) private String courseId;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private Status status;
    @Column(name="expires_at") private LocalDate expiresAt;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    protected Enrolment() {}
    public Enrolment(UUID studentId,String courseId,Status status,LocalDate expiresAt){
        this.id=UUID.randomUUID();this.studentId=studentId;this.courseId=courseId;
        this.status=status;this.expiresAt=expiresAt;this.createdAt=Instant.now();
    }
    public void update(Status status,LocalDate expiresAt){this.status=status;this.expiresAt=expiresAt;}
    public boolean activeOn(LocalDate date){return status==Status.ACTIVE&&(expiresAt==null||!expiresAt.isBefore(date));}
    public UUID getId(){return id;}
    public UUID getStudentId(){return studentId;}
    public String getCourseId(){return courseId;}
    public Status getStatus(){return status;}
    public LocalDate getExpiresAt(){return expiresAt;}
    public Instant getCreatedAt(){return createdAt;}
}
