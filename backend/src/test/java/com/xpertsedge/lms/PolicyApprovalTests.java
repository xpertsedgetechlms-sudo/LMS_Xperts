package com.xpertsedge.lms;

import com.xpertsedge.lms.auth.IdentityService;
import com.xpertsedge.lms.domain.Role;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.json.JsonMapper;
import java.net.*;
import java.net.http.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties="spring.datasource.url=jdbc:h2:mem:policy-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
@ActiveProfiles("test")
class PolicyApprovalTests {
    @Value("${local.server.port}")int port;@Autowired IdentityService identities;
    final JsonMapper json=JsonMapper.builder().build();final String password="PolicyReviewPassword42!";
    class Browser {
        final HttpClient client=HttpClient.newBuilder().cookieHandler(new CookieManager(null,CookiePolicy.ACCEPT_ALL)).build();String csrf;
        HttpResponse<String> send(String method,String path,Object body)throws Exception{
            if(!method.equals("GET"))csrf=(String)json.readValue(send("GET","/api/auth/csrf",null).body(),Map.class).get("token");
            var r=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path));if(csrf!=null)r.header("X-CSRF-TOKEN",csrf);if(body!=null)r.header("Content-Type","application/json");
            return client.send(r.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(),HttpResponse.BodyHandlers.ofString());
        }
        void login(String email)throws Exception{assertEquals(200,send("POST","/api/auth/login",Map.of("email",email,"password",password)).statusCode());}
    }
    @Test void onlyAuthorisedApprovalPublishesAndDraftEditsStayPrivate()throws Exception{
        identities.create("Policy Admin","admin@policy.example",password,Role.ADMIN);identities.create("Policy Student","student@policy.example",password,Role.STUDENT);
        Browser publicUser=new Browser(),admin=new Browser(),student=new Browser();admin.login("admin@policy.example");student.login("student@policy.example");
        var publicBefore=publicUser.send("GET","/api/public/policies",null);assertEquals(200,publicBefore.statusCode());assertFalse(publicBefore.body().contains("draft_text"));assertFalse(publicBefore.body().contains("INSTITUTE REVIEW DRAFT"));
        assertEquals(403,student.send("GET","/api/admin/policies",null).statusCode());
        assertEquals(400,admin.send("POST","/api/admin/policies/privacy/publish",Map.of("revision",1,"approved",true)).statusCode());
        String reviewed="TEST POLICY WORDING ONLY. Reviewed privacy notice for a disposable test institute account. Contact the institute for access, correction, deletion and grievance support. This is not a live legal publication.";
        assertEquals(200,admin.send("PUT","/api/admin/policies/privacy",Map.of("revision",1,"text",reviewed)).statusCode());
        assertFalse(publicUser.send("GET","/api/public/policies",null).body().contains(reviewed));
        assertEquals(400,admin.send("POST","/api/admin/policies/privacy/publish",Map.of("revision",2,"approved",false)).statusCode());
        assertEquals(403,student.send("POST","/api/admin/policies/privacy/publish",Map.of("revision",2,"approved",true)).statusCode());
        assertEquals(409,admin.send("POST","/api/admin/policies/privacy/publish",Map.of("revision",1,"approved",true)).statusCode());
        assertEquals(200,admin.send("POST","/api/admin/policies/privacy/publish",Map.of("revision",2,"approved",true)).statusCode());
        assertTrue(publicUser.send("GET","/api/public/policies",null).body().contains(reviewed));
        assertEquals(200,admin.send("PUT","/api/admin/policies/privacy",Map.of("revision",3,"text",reviewed+" Additional pending review.")).statusCode());
        assertFalse(publicUser.send("GET","/api/public/policies",null).body().contains("Additional pending review"));
        assertTrue(admin.send("GET","/api/admin/policies",null).body().contains("Policy Admin"));
    }
}
