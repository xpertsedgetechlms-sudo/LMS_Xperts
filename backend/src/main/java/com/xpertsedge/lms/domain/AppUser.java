package com.xpertsedge.lms.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="app_users")
public class AppUser {
    @Id private UUID id;
    @Column(nullable=false,length=100) private String name;
    @Column(nullable=false,unique=true,length=254) private String email;
    @Column(name="password_hash",nullable=false,length=100) private String passwordHash;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private Role role;
    @Column(nullable=false) private boolean enabled;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    protected AppUser() {}
    public AppUser(String name,String email,String hash,Role role) {
        this.id=UUID.randomUUID();this.name=name;this.email=email;this.passwordHash=hash;
        this.role=role;this.enabled=true;this.createdAt=Instant.now();
    }
    public void updateProfile(String name,String email,boolean enabled){this.name=name;this.email=email;this.enabled=enabled;}
    public UUID getId(){return id;}
    public String getName(){return name;}
    public String getEmail(){return email;}
    public String getPasswordHash(){return passwordHash;}
    public Role getRole(){return role;}
    public boolean isEnabled(){return enabled;}
    public Instant getCreatedAt(){return createdAt;}
}
