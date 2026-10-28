package com.xpertsedge.lms.notifications;

import com.xpertsedge.lms.auth.IdentityService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import java.util.*;

@RestController @RequestMapping("/api/admin/email-notifications")
public class EmailDeliveryController {
    private final JdbcTemplate db;private final IdentityService identities;private final LearningEmails emails;
    public EmailDeliveryController(JdbcTemplate db,IdentityService identities,LearningEmails emails){this.db=db;this.identities=identities;this.emails=emails;}
    @GetMapping public Map<String,Object> list(Authentication auth){
        identities.current(auth);
        return Map.of("enabled",emails.enabled(),"counts",db.queryForList("SELECT status,COUNT(*) AS total FROM learning_email_outbox GROUP BY status"),"records",db.queryForList("SELECT o.id,o.kind,o.subject,o.status,o.attempts,o.created_at,o.sent_at,o.last_error,u.name AS student_name FROM learning_email_outbox o JOIN app_users u ON u.id=o.student_id ORDER BY o.created_at DESC LIMIT 50"));
    }
    @PostMapping("/{id}/retry") public Map<String,Object> retry(@PathVariable UUID id,Authentication auth){
        identities.current(auth);
        if(!emails.enabled())throw new com.xpertsedge.lms.common.ApiException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,"Activate SMTP and notifications before retrying.");
        int updated=db.update("UPDATE learning_email_outbox SET status='PENDING',attempts=0,last_error=NULL,next_attempt_at=?,locked_at=NULL WHERE id=? AND status='FAILED'",java.sql.Timestamp.from(java.time.Instant.now()),id);
        if(updated!=1)throw new com.xpertsedge.lms.common.ApiException(org.springframework.http.HttpStatus.CONFLICT,"Only failed messages can be retried. Refresh email status.");
        return Map.of("queued",true);
    }
}
