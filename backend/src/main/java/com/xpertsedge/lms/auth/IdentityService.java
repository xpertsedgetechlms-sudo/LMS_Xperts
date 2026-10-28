package com.xpertsedge.lms.auth;

import com.xpertsedge.lms.domain.*;
import com.xpertsedge.lms.common.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.*;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class IdentityService implements UserDetailsService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    public IdentityService(UserRepository users,PasswordEncoder passwords){this.users=users;this.passwords=passwords;}
    public static String normalize(String email){return email.strip().toLowerCase(Locale.ROOT);}
    @Override public UserDetails loadUserByUsername(String email){
        AppUser u=users.findByEmail(normalize(email)).orElseThrow(()->new UsernameNotFoundException("Invalid credentials"));
        return User.withUsername(u.getEmail()).password(u.getPasswordHash()).roles(u.getRole().name()).disabled(!u.isEnabled()).build();
    }
    public AppUser current(Authentication auth){
        if(auth==null||!auth.isAuthenticated())throw new ApiException(HttpStatus.UNAUTHORIZED,"Sign in to continue.");
        AppUser u=users.findByEmail(auth.getName()).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Sign in to continue."));
        if(!u.isEnabled())throw new ApiException(HttpStatus.FORBIDDEN,"Account access is disabled.");
        return u;
    }
    @Transactional public AppUser create(String name,String email,String password,Role role){
        if(password.length()<12||password.getBytes(StandardCharsets.UTF_8).length>72)throw new ApiException(HttpStatus.BAD_REQUEST,"Use a password with at least 12 characters and at most 72 UTF-8 bytes.");
        String normalized=normalize(email);
        if(users.findByEmail(normalized).isPresent())throw new ApiException(HttpStatus.CONFLICT,"This email is already registered.");
        return users.saveAndFlush(new AppUser(name.strip(),normalized,passwords.encode(password),role));
    }
    public record UserView(UUID id,String name,String email,Role role){
        public static UserView of(AppUser u){return new UserView(u.getId(),u.getName(),u.getEmail(),u.getRole());}
    }
}
