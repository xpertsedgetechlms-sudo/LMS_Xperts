package com.xpertsedge.lms;

import com.xpertsedge.lms.config.AuthRateLimitFilter;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import java.time.*;
import static org.junit.jupiter.api.Assertions.*;

class AuthRateLimitTests {
    static class TestClock extends Clock {
        Instant now=Instant.parse("2026-10-22T09:00:00Z");
        public ZoneId getZone(){return ZoneOffset.UTC;}
        public Clock withZone(ZoneId zone){return this;}
        public Instant instant(){return now;}
    }
    int attempt(AuthRateLimitFilter filter,String ip)throws Exception{
        MockHttpServletRequest req=new MockHttpServletRequest("POST","/api/auth/login");req.setServletPath("/api/auth/login");req.setRemoteAddr(ip);
        MockHttpServletResponse response=new MockHttpServletResponse();filter.doFilter(req,response,(a,b)->{});return response.getStatus();
    }
    @Test void throttlesAndRecoversWithoutTrustingForwardedIdentity()throws Exception{
        TestClock clock=new TestClock();AuthRateLimitFilter filter=new AuthRateLimitFilter(clock);
        for(int i=0;i<10;i++)assertEquals(200,attempt(filter,"127.0.0.1"));
        assertEquals(429,attempt(filter,"127.0.0.1"));assertEquals(200,attempt(filter,"127.0.0.2"));
        clock.now=clock.now.plusSeconds(61);assertEquals(200,attempt(filter,"127.0.0.1"));
    }
}
