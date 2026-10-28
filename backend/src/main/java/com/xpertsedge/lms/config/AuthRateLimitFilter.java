package com.xpertsedge.lms.config;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.time.Clock;
import java.util.*;

/** Per-process protection. Shared throttling is required before multiple replicas. */
public class AuthRateLimitFilter extends OncePerRequestFilter {
    private record Bucket(long start,int requests){}
    private final Map<String,Bucket> buckets=new HashMap<>();
    private final Clock clock;
    public AuthRateLimitFilter(Clock clock){this.clock=clock;}
    private synchronized boolean allow(String key,int limit,long window){
        long now=clock.millis();
        if(buckets.size()>=10000){buckets.entrySet().removeIf(e->now-e.getValue().start()>=3600000);if(!buckets.containsKey(key)&&buckets.size()>=10000)return false;}
        Bucket b=buckets.get(key);
        if(b==null||now-b.start()>=window){buckets.put(key,new Bucket(now,1));return true;}
        if(b.requests()>=limit)return false;
        buckets.put(key,new Bucket(b.start(),b.requests()+1));return true;
    }
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)throws ServletException,IOException{
        String path=request.getServletPath();
        if(request.getMethod().equals("POST")&&(path.equals("/api/auth/login")||path.equals("/api/auth/register")||path.equals("/api/auth/forgot-password")||path.equals("/api/auth/reset-password"))){
            boolean login=path.endsWith("login");
            boolean recovery=path.endsWith("forgot-password")||path.endsWith("reset-password");
            // Do not trust client-supplied forwarding headers as an identity.
            if(!allow(path+":"+request.getRemoteAddr(),recovery?20:login?10:5,(login||recovery)?60000:3600000)){
                response.setStatus(429);response.setHeader("Retry-After",(login||recovery)?"60":"3600");response.setContentType("application/json");response.getWriter().write("{\"message\":\"Too many attempts. Please try again later.\"}");return;
            }
        }
        chain.doFilter(request,response);
    }
}
