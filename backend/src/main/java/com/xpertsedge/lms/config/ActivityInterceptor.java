package com.xpertsedge.lms.config;

import com.xpertsedge.lms.auth.IdentityService;
import com.xpertsedge.lms.domain.AppUser;
import jakarta.servlet.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.servlet.HandlerInterceptor;
import org.slf4j.*;
import java.time.*;
import java.util.Set;

/** Records successful authenticated mutations only; never reads request bodies, cookies or credentials. */
public class ActivityInterceptor implements HandlerInterceptor {
    private static final Logger log=LoggerFactory.getLogger(ActivityInterceptor.class);
    private static final String ACTOR=ActivityInterceptor.class.getName()+".actor";
    private final JdbcTemplate db;private final IdentityService identities;private final Clock clock;
    public ActivityInterceptor(JdbcTemplate db,IdentityService identities,Clock clock){this.db=db;this.identities=identities;this.clock=clock;}
    @Override public boolean preHandle(HttpServletRequest request,HttpServletResponse response,Object handler){
        if(Set.of("POST","PUT","PATCH","DELETE").contains(request.getMethod())){
            try{request.setAttribute(ACTOR,identities.current(SecurityContextHolder.getContext().getAuthentication()));}catch(Exception ignored){/* Controller/security handles unauthorised requests. */}
        }
        return true;
    }
    @Override public void afterCompletion(HttpServletRequest request,HttpServletResponse response,Object handler,Exception exception){
        if(exception!=null||response.getStatus()<200||response.getStatus()>=300||!(request.getAttribute(ACTOR) instanceof AppUser actor))return;
        try{db.update("INSERT INTO activity_events(actor_id,actor_name,request_method,route,response_status,created_at) VALUES(?,?,?,?,?,?)",actor.getId(),actor.getName(),request.getMethod(),request.getRequestURI(),response.getStatus(),OffsetDateTime.now(clock));}
        catch(Exception error){log.error("Could not record successful request activity ({})",error.getClass().getSimpleName());}
    }
}
