package com.xpertsedge.lms.config;
import com.xpertsedge.lms.auth.IdentityService;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.servlet.config.annotation.*;
import java.time.Clock;

@Configuration
public class ActivityConfig implements WebMvcConfigurer {
    private final JdbcTemplate db;private final IdentityService identities;private final Clock clock;
    public ActivityConfig(JdbcTemplate db,IdentityService identities,Clock clock){this.db=db;this.identities=identities;this.clock=clock;}
    @Override public void addInterceptors(InterceptorRegistry registry){registry.addInterceptor(new ActivityInterceptor(db,identities,clock)).addPathPatterns("/api/admin/**","/api/workspace/**").excludePathPatterns("/api/workspace/notifications/**");}
}
