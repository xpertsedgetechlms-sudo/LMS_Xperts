package com.xpertsedge.lms.users;

import com.xpertsedge.lms.auth.IdentityService;
import com.xpertsedge.lms.domain.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/workspace/profile")
public class ProfileController {
    private final IdentityService identities;
    private final UserRepository users;
    private final JdbcTemplate db;
    public ProfileController(IdentityService identities,UserRepository users,JdbcTemplate db){this.identities=identities;this.users=users;this.db=db;}
    public record ProfileInput(@NotBlank @Size(min=2,max=100)String name,@NotNull @Size(max=30)String phone,@NotNull @Size(max=2000)String bio,@NotNull @Size(max=150)String specialisation){}
    public record ProfileView(UUID id,String name,String email,Role role,String phone,String bio,String specialisation){}
    private ProfileView view(AppUser u){var rows=db.queryForList("SELECT phone,bio,specialisation FROM account_profiles WHERE user_id=?",u.getId());var p=rows.isEmpty()?Map.of("phone","","bio","","specialisation",""):rows.getFirst();return new ProfileView(u.getId(),u.getName(),u.getEmail(),u.getRole(),p.get("phone").toString(),p.get("bio").toString(),p.get("specialisation").toString());}
    @GetMapping public ProfileView current(Authentication auth){return view(identities.current(auth));}
    @PutMapping @Transactional public ProfileView update(@Valid @RequestBody ProfileInput r,Authentication auth){
        AppUser u=identities.current(auth);
        if(r.name().strip().length()<2)throw new com.xpertsedge.lms.common.ApiException(org.springframework.http.HttpStatus.BAD_REQUEST,"Use at least 2 characters for your name.");
        // Lock the current account so simultaneous first saves cannot create duplicate profile rows.
        db.queryForObject("SELECT id FROM app_users WHERE id=? FOR UPDATE",UUID.class,u.getId());
        u.updateProfile(r.name().strip(),u.getEmail(),u.isEnabled());users.saveAndFlush(u);
        String specialisation=u.getRole()==Role.TRAINER?r.specialisation().strip():"";
        int changed=db.update("UPDATE account_profiles SET phone=?,bio=?,specialisation=? WHERE user_id=?",r.phone().strip(),r.bio().strip(),specialisation,u.getId());
        if(changed==0)db.update("INSERT INTO account_profiles(user_id,phone,bio,specialisation) VALUES(?,?,?,?)",u.getId(),r.phone().strip(),r.bio().strip(),specialisation);
        return view(u);
    }
}
