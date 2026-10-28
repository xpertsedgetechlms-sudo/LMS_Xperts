package com.xpertsedge.lms.config;

import com.xpertsedge.lms.auth.IdentityService;
import com.xpertsedge.lms.domain.*;
import org.springframework.boot.*;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.*;

@Component
public class BootstrapAdmin implements ApplicationRunner {
    private static final Logger log=LoggerFactory.getLogger(BootstrapAdmin.class);
    private final IdentityService identities;
    private final UserRepository users;
    private final String email,password;
    public BootstrapAdmin(IdentityService identities,UserRepository users,@Value("${lms.bootstrap-admin.email:}")String email,@Value("${lms.bootstrap-admin.password:}")String password){this.identities=identities;this.users=users;this.email=email;this.password=password;}
    @Override public void run(ApplicationArguments args){
        if(email.isBlank()&&password.isBlank())return;
        if(email.isBlank()||password.isBlank()||!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))throw new IllegalStateException("Provide a valid bootstrap admin email and a strong password together.");
        if(users.existsByRole(Role.ADMIN)){log.info("Administrator already exists; bootstrap skipped.");return;}
        if(users.findByEmail(IdentityService.normalize(email)).isPresent())throw new IllegalStateException("Bootstrap email already belongs to an account. Existing accounts are never promoted automatically.");
        identities.create("Administrator",email,password,Role.ADMIN);
        log.info("Initial administrator created. Remove bootstrap credentials from the environment before the next start.");
    }
}
