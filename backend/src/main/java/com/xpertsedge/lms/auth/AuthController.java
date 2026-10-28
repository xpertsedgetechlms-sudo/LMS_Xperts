package com.xpertsedge.lms.auth;

import com.xpertsedge.lms.domain.Role;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.authentication.*;
import org.springframework.security.core.*;
import org.springframework.security.core.context.*;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.*;

@RestController @RequestMapping("/api/auth")
public class AuthController {
    private final IdentityService identities;
    private final AuthenticationManager manager;
    private final SecurityContextRepository contexts;
    private final CsrfTokenRepository csrf;
    private final org.springframework.jdbc.core.JdbcTemplate db;
    public AuthController(IdentityService identities,AuthenticationManager manager,SecurityContextRepository contexts,CsrfTokenRepository csrf,org.springframework.jdbc.core.JdbcTemplate db){this.identities=identities;this.manager=manager;this.contexts=contexts;this.csrf=csrf;this.db=db;}
    public record RegisterRequest(@NotBlank @Size(min=2,max=100) String name,@NotBlank @Email @Size(max=254) String email,@NotBlank @Size(min=12,max=72) String password){}
    public record LoginRequest(@NotBlank @Email @Size(max=254) String email,@NotBlank @Size(max=72) String password){}
    public record CsrfView(String headerName,String token){}
    @GetMapping("/csrf") public CsrfView token(CsrfToken token){return new CsrfView(token.getHeaderName(),token.getToken());}
    @PostMapping("/register") public ResponseEntity<IdentityService.UserView> register(@Valid @RequestBody RegisterRequest r){
        // Public registration always creates STUDENT. No client-supplied role exists.
        return ResponseEntity.status(HttpStatus.CREATED).body(IdentityService.UserView.of(identities.create(r.name(),r.email(),r.password(),Role.STUDENT)));
    }
    @PostMapping("/login") public IdentityService.UserView login(@Valid @RequestBody LoginRequest r,HttpServletRequest request,HttpServletResponse response){
        if(r.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72)throw new BadCredentialsException("Invalid credentials");
        var versions=db.query("SELECT credential_version FROM app_users WHERE email=?",(rs,n)->rs.getLong(1),IdentityService.normalize(r.email()));
        long version=versions.isEmpty()?0:versions.get(0);
        Authentication auth=manager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(r.email(),r.password()));
        request.getSession(true).setAttribute("credentialVersion",version);
        if(request.getSession(false)!=null)request.changeSessionId();
        SecurityContext context=SecurityContextHolder.createEmptyContext();context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);contexts.saveContext(context,request,response);
        csrf.saveToken(null,request,response);
        return IdentityService.UserView.of(identities.current(auth));
    }
    @GetMapping("/me") public IdentityService.UserView me(Authentication auth){return IdentityService.UserView.of(identities.current(auth));}
}
