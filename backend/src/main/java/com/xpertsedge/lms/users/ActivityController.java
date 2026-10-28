package com.xpertsedge.lms.users;
import com.xpertsedge.lms.auth.IdentityService;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/admin/activity")
public class ActivityController {
    private final JdbcTemplate db;private final IdentityService identities;
    public ActivityController(JdbcTemplate db,IdentityService identities){this.db=db;this.identities=identities;}
    @GetMapping public Map<String,Object> events(Authentication auth,@RequestParam(defaultValue="0") @Min(0) @Max(1000000)int page,@RequestParam(defaultValue="25") @Min(1) @Max(100)int size,@RequestParam(defaultValue="") @Size(max=100)String search){
        identities.current(auth);String pattern="%"+search.toLowerCase(Locale.ROOT)+"%";
        var rows=db.queryForList("SELECT id,actor_id,actor_name,request_method,route,response_status,created_at FROM activity_events WHERE LOWER(actor_name) LIKE ? OR LOWER(route) LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?",pattern,pattern,size,page*size);
        Long total=db.queryForObject("SELECT COUNT(*) FROM activity_events WHERE LOWER(actor_name) LIKE ? OR LOWER(route) LIKE ?",Long.class,pattern,pattern);
        return Map.of("items",rows,"total",total,"page",page,"size",size);
    }
}
