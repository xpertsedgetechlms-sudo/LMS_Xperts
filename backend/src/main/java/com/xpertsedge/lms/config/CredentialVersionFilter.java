package com.xpertsedge.lms.config;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

/** Revoke existing browser sessions after a password reset, including other devices. */
public class CredentialVersionFilter extends OncePerRequestFilter {
    private final JdbcTemplate db;
    public CredentialVersionFilter(JdbcTemplate db){this.db=db;}
    @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws ServletException,IOException{
        var auth=SecurityContextHolder.getContext().getAuthentication();var session=req.getSession(false);
        if(auth!=null&&auth.isAuthenticated()&&session!=null){
            var versions=db.query("SELECT credential_version FROM app_users WHERE email=? AND enabled=true",(rs,n)->rs.getLong(1),auth.getName());
            Object saved=session.getAttribute("credentialVersion");long expected=saved instanceof Number n?n.longValue():0;
            if(versions.isEmpty()||versions.get(0)!=expected){session.invalidate();SecurityContextHolder.clearContext();}
        }
        chain.doFilter(req,res);
    }
}
