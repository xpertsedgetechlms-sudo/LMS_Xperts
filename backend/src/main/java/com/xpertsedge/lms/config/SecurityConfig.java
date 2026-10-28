package com.xpertsedge.lms.config;

import org.springframework.context.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.authentication.*;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.context.*;
import org.springframework.security.web.csrf.*;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;
import java.time.Clock;
import java.util.*;

@Configuration @EnableMethodSecurity
public class SecurityConfig {
    @Bean Clock clock(){return Clock.systemUTC();}
    @Bean PasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder(12);}
    @Bean CsrfTokenRepository csrfRepository(){return new HttpSessionCsrfTokenRepository();}
    @Bean SecurityContextRepository contextRepository(){return new HttpSessionSecurityContextRepository();}
    @Bean AuthenticationManager authenticationManager(UserDetailsService users,PasswordEncoder passwords){
        DaoAuthenticationProvider provider=new DaoAuthenticationProvider(users);provider.setPasswordEncoder(passwords);return new ProviderManager(provider);
    }
    @Bean SecurityFilterChain security(HttpSecurity http,CsrfTokenRepository csrf,SecurityContextRepository contexts,Clock clock,CorsConfigurationSource cors,org.springframework.jdbc.core.JdbcTemplate jdbc)throws Exception{
        http.cors(c->c.configurationSource(cors)).csrf(c->c.csrfTokenRepository(csrf))
            .securityContext(c->c.securityContextRepository(contexts).requireExplicitSave(true))
            .authorizeHttpRequests(a->a
                .requestMatchers(HttpMethod.GET,"/api/health","/api/auth/csrf","/api/courses","/api/public/settings","/api/public/policies").permitAll()
                .requestMatchers(HttpMethod.POST,"/api/auth/login","/api/auth/register","/api/auth/forgot-password","/api/auth/reset-password").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/trainer/**").hasRole("TRAINER")
                .requestMatchers("/api/student/**").hasRole("STUDENT")
                .requestMatchers("/api/auth/me","/api/courses/*/access","/api/workspace/**").authenticated()
                .anyRequest().denyAll())
            .exceptionHandling(e->e.authenticationEntryPoint((req,res,ex)->{res.setStatus(401);res.setContentType("application/json");res.getWriter().write("{\"message\":\"Sign in to continue.\"}");})
                .accessDeniedHandler((req,res,ex)->{res.setStatus(403);res.setContentType("application/json");res.getWriter().write("{\"message\":\"Access denied or CSRF token missing.\"}");}))
            .requestCache(c->c.disable())
            .logout(l->l.logoutUrl("/api/auth/logout").invalidateHttpSession(true).clearAuthentication(true).deleteCookies("XPERTSEDGE_SESSION").logoutSuccessHandler((req,res,auth)->res.setStatus(204)))
            .addFilterBefore(new CredentialVersionFilter(jdbc),org.springframework.security.web.csrf.CsrfFilter.class)
            .addFilterBefore(new AuthRateLimitFilter(clock),UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
    @Bean CorsConfigurationSource cors(@Value("${lms.allowed-origins}")String origins){
        CorsConfiguration c=new CorsConfiguration();
        c.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::strip).filter(s->!s.isEmpty()).toList());
        c.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS"));
        c.setAllowedHeaders(List.of("Content-Type","X-CSRF-TOKEN"));c.setAllowCredentials(true);c.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source=new UrlBasedCorsConfigurationSource();source.registerCorsConfiguration("/api/**",c);return source;
    }
}
