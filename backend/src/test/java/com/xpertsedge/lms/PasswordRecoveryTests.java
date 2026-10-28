package com.xpertsedge.lms;

import com.xpertsedge.lms.auth.*;
import com.xpertsedge.lms.domain.Role;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.json.JsonMapper;
import java.net.*;
import java.net.http.*;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties="spring.datasource.url=jdbc:h2:mem:recovery;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
@ActiveProfiles("test")
class PasswordRecoveryTests {
    @Value("${local.server.port}")int port;
    @Autowired IdentityService identities;@Autowired JdbcTemplate db;@Autowired PasswordRecovery recovery;
    @MockitoBean RecoveryMail mail;
    final JsonMapper json=JsonMapper.builder().build();
    static final String EMAIL="recovery@test.example",OLD="OriginalPassword42!",NEW="ReplacementPassword42!";
    class Browser {
        final HttpClient client=HttpClient.newBuilder().cookieHandler(new CookieManager(null,CookiePolicy.ACCEPT_ALL)).build();String csrf;
        HttpResponse<String> send(String method,String path,Object body,boolean useCsrf)throws Exception{
            var builder=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).timeout(Duration.ofSeconds(15));
            if(useCsrf&&csrf!=null)builder.header("X-CSRF-TOKEN",csrf);
            if(body!=null)builder.header("Content-Type","application/json");
            return client.send(builder.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(),HttpResponse.BodyHandlers.ofString());
        }
        void token()throws Exception{csrf=(String)json.readValue(send("GET","/api/auth/csrf",null,false).body(),Map.class).get("token");}
        int login(String password)throws Exception{token();return send("POST","/api/auth/login",Map.of("email",EMAIL,"password",password),true).statusCode();}
        HttpResponse<String> forgot(String email)throws Exception{return send("POST","/api/auth/forgot-password",Map.of("email",email),true);}
        int reset(String token,String password)throws Exception{return send("POST","/api/auth/reset-password",Map.of("token",token,"password",password),true).statusCode();}
    }
    @Test void resetIsPrivateSingleUseExpiringAndRevokesSessions()throws Exception{
        identities.create("Recovery Learner",EMAIL,OLD,Role.STUDENT);
        Browser existing=new Browser();assertEquals(200,existing.login(OLD));
        Browser browser=new Browser();browser.token();
        assertEquals(403,browser.send("POST","/api/auth/forgot-password",Map.of("email",EMAIL),false).statusCode());
        assertThrows(com.xpertsedge.lms.common.ApiException.class,()->recovery.request(EMAIL)); // No misleading sent message without SMTP.
        when(mail.enabled()).thenReturn(true);
        var unknown=browser.forgot("missing@test.example");var known=browser.forgot(EMAIL);
        assertEquals(202,known.statusCode());assertEquals(unknown.body(),known.body());assertFalse(known.body().contains("token"));
        var tokens=ArgumentCaptor.forClass(String.class);
        verify(mail,timeout(5000)).send(eq(EMAIL),tokens.capture());String first=tokens.getValue();
        assertEquals(43,first.length());
        assertNotEquals(first,db.queryForObject("SELECT token_hash FROM password_reset_tokens",String.class));
        assertEquals(202,browser.forgot(EMAIL).statusCode()); // Account cooldown.
        db.update("UPDATE password_reset_tokens SET requested_at=?",java.sql.Timestamp.from(Instant.now().minusSeconds(120)));
        browser.forgot(EMAIL);tokens=ArgumentCaptor.forClass(String.class);verify(mail,timeout(5000).times(2)).send(eq(EMAIL),tokens.capture());String second=tokens.getAllValues().get(1);
        assertEquals(400,browser.reset(first,NEW)); // Reissued links invalidate old links.
        db.update("UPDATE password_reset_tokens SET expires_at=?,requested_at=?",java.sql.Timestamp.from(Instant.now().minusSeconds(1)),java.sql.Timestamp.from(Instant.now().minusSeconds(120)));
        assertEquals(400,browser.reset(second,NEW));
        browser.forgot(EMAIL);tokens=ArgumentCaptor.forClass(String.class);verify(mail,timeout(5000).times(3)).send(eq(EMAIL),tokens.capture());String third=tokens.getAllValues().get(2);
        assertEquals(400,browser.reset(third,"short"));
        assertEquals(200,browser.reset(third,NEW));
        assertEquals(400,browser.reset(third,NEW));
        assertEquals(401,existing.send("GET","/api/auth/me",null,false).statusCode());
        assertEquals(401,browser.login(OLD));assertEquals(200,browser.login(NEW));
        assertEquals(0,db.queryForObject("SELECT count(*) FROM password_reset_tokens",Integer.class));
    }
}
