package com.xpertsedge.lms.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="courses")
public class Course {
    @Id @Column(length=60) private String id;
    @Column(nullable=false,length=150) private String name;
    @Column(nullable=false,length=100) private String category;
    @Column(nullable=false,length=2000) private String description;
    @Column(precision=12,scale=2) private BigDecimal price;
    @Column(nullable=false) private boolean published;
    @Column(name="trainer_id") private UUID trainerId;
    @Column(length=100) private String duration;
    @Column(length=50) private String level;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    protected Course() {}
    public Course(String id,String name,String category,String description,BigDecimal price,boolean published,UUID trainerId,String duration,String level){
        this.id=id;this.name=name;this.category=category;this.description=description;this.price=price;
        this.published=published;this.trainerId=trainerId;this.duration=duration;this.level=level;this.createdAt=Instant.now();
    }
    public void update(String name,String category,String description,BigDecimal price,boolean published,UUID trainerId,String duration,String level){
        this.name=name;this.category=category;this.description=description;this.price=price;this.published=published;this.trainerId=trainerId;this.duration=duration;this.level=level;
    }
    public String getId(){return id;}
    public String getName(){return name;}
    public String getCategory(){return category;}
    public String getDescription(){return description;}
    public BigDecimal getPrice(){return price;}
    public boolean isPublished(){return published;}
    public UUID getTrainerId(){return trainerId;}
    public String getDuration(){return duration;}
    public String getLevel(){return level;}
}
