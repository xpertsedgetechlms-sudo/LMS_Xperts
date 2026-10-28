package com.xpertsedge.lms.learning;

import com.xpertsedge.lms.auth.IdentityService;
import com.xpertsedge.lms.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import java.time.*;
import java.util.*;
import java.nio.charset.StandardCharsets;

@RestController
public class PolicyController {
    private final JdbcTemplate db;private final IdentityService identities;private final Clock clock;
    public PolicyController(JdbcTemplate db,IdentityService identities,Clock clock){this.db=db;this.identities=identities;this.clock=clock;}
    @Bean ApplicationRunner policyDrafts(){return args->{for(String kind:List.of("privacy","terms","refund")){
        if(db.queryForObject("SELECT count(*) FROM institute_policies WHERE kind=?",Integer.class,kind)==0){
            try(var in=getClass().getResourceAsStream("/policies/"+kind+".txt")){if(in==null)throw new IllegalStateException("Missing policy draft");db.update("INSERT INTO institute_policies(kind,draft_text) VALUES(?,?)",kind,new String(in.readAllBytes(),StandardCharsets.UTF_8));}
        }
    }};}
    @GetMapping("/api/public/policies") public List<?> published(){return db.queryForList("SELECT kind,published_text,approved_at FROM institute_policies ORDER BY kind");}
    @GetMapping("/api/admin/policies") public List<?> drafts(Authentication a){identities.current(a);return db.queryForList("SELECT * FROM institute_policies ORDER BY kind");}
    record Draft(@NotBlank @Size(min=100,max=12000)String text,@NotNull @Min(1)Integer revision){}
    record Approval(@NotNull @Min(1)Integer revision,@AssertTrue boolean approved){}
    @PutMapping("/api/admin/policies/{kind}") @Transactional public Map<String,Object> save(@PathVariable String kind,@Valid @RequestBody Draft r,Authentication a){
        identities.current(a);check(db.update("UPDATE institute_policies SET draft_text=?,revision=revision+1 WHERE kind=? AND revision=?",r.text().strip(),kind,r.revision()));return Map.of("saved",true);
    }
    @PostMapping("/api/admin/policies/{kind}/publish") @Transactional public Map<String,Object> publish(@PathVariable String kind,@Valid @RequestBody Approval r,Authentication a){
        var user=identities.current(a);
        var text=db.queryForList("SELECT draft_text FROM institute_policies WHERE kind=?",kind);
        if(text.isEmpty()||text.getFirst().get("draft_text").toString().toLowerCase(Locale.ROOT).contains("draft"))throw new ApiException(HttpStatus.BAD_REQUEST,"Finish the institute review and remove draft labels/notes before publishing.");
        check(db.update("UPDATE institute_policies SET published_text=draft_text,approved_by=?,approved_name=?,approved_at=?,revision=revision+1 WHERE kind=? AND revision=?",user.getId(),user.getName(),OffsetDateTime.now(clock),kind,r.revision()));return Map.of("published",true);
    }
    private void check(int count){if(count!=1)throw new ApiException(HttpStatus.CONFLICT,"Policy changed or was not found. Refresh and review the current revision.");}
}
