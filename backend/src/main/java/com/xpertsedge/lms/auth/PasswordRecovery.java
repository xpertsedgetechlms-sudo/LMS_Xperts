package com.xpertsedge.lms.auth;

import com.xpertsedge.lms.common.ApiException;
import jakarta.annotation.PreDestroy;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.*;
import org.slf4j.LoggerFactory;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;

@Service
public class PasswordRecovery {
    private final JdbcTemplate db;private final TransactionTemplate tx;private final PasswordEncoder passwords;private final RecoveryMail mail;private final Clock clock;
    private final SecureRandom random=new SecureRandom();
    private final ExecutorService queue=new ThreadPoolExecutor(2,2,0L,TimeUnit.MILLISECONDS,new ArrayBlockingQueue<>(100),new ThreadPoolExecutor.AbortPolicy());
    public PasswordRecovery(JdbcTemplate db,TransactionTemplate tx,PasswordEncoder passwords,RecoveryMail mail,Clock clock){this.db=db;this.tx=tx;this.passwords=passwords;this.mail=mail;this.clock=clock;}
    @PreDestroy void close(){queue.shutdownNow();}
    record Delivery(String email,String token){}
    static String hash(String token){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
    public void request(String email){
        if(!mail.enabled())throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"Password reset email is not configured yet. Please contact the institute.");
        try{queue.execute(()->{
            Delivery delivery=null;
            try{
                delivery=tx.execute(status->issue(IdentityService.normalize(email)));
                if(delivery!=null)mail.send(delivery.email(),delivery.token());
            }catch(Exception e){
                if(delivery!=null)db.update("DELETE FROM password_reset_tokens WHERE token_hash=?",hash(delivery.token()));
                // Never log email addresses, raw tokens, mail bodies or SMTP exception details.
                LoggerFactory.getLogger(PasswordRecovery.class).warn("Password recovery email could not be delivered. Check mail service configuration.");
            }
        });}catch(RejectedExecutionException e){throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"Password reset is busy. Please try again later.");}
    }
    private Delivery issue(String email){
        var people=db.queryForList("SELECT id FROM app_users WHERE email=? AND enabled=true FOR UPDATE",email);
        if(people.isEmpty())return null;
        Object id=people.get(0).get("id");Instant now=clock.instant();
        var previous=db.query("SELECT requested_at FROM password_reset_tokens WHERE user_id=?",(rs,n)->rs.getTimestamp(1).toInstant(),id);
        if(!previous.isEmpty()&&previous.get(0).plusSeconds(60).isAfter(now))return null;
        byte[] bytes=new byte[32];random.nextBytes(bytes);String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        db.update("DELETE FROM password_reset_tokens WHERE user_id=?",id);
        db.update("INSERT INTO password_reset_tokens(user_id,token_hash,expires_at,requested_at) VALUES(?,?,?,?)",id,hash(token),Timestamp.from(now.plusSeconds(1800)),Timestamp.from(now));
        return new Delivery(email,token);
    }
    public void reset(String token,String password){
        if(password.length()<12||password.getBytes(StandardCharsets.UTF_8).length>72)throw new ApiException(HttpStatus.BAD_REQUEST,"Use at least 12 characters and at most 72 UTF-8 bytes.");
        tx.executeWithoutResult(status->{
            // Lock the account first, matching request issuance order, to serialize concurrent resets.
            var ids=db.queryForList("SELECT user_id FROM password_reset_tokens WHERE token_hash=?",hash(token));
            if(ids.isEmpty())throw invalid();
            Object id=ids.get(0).get("user_id");
            var active=db.queryForList("SELECT id FROM app_users WHERE id=? AND enabled=true FOR UPDATE",id);
            if(active.isEmpty())throw invalid();
            var rows=db.query("SELECT expires_at FROM password_reset_tokens WHERE user_id=? AND token_hash=?",(rs,n)->rs.getTimestamp(1).toInstant(),id,hash(token));
            if(rows.isEmpty()||!rows.get(0).isAfter(clock.instant()))throw invalid();
            db.update("UPDATE app_users SET password_hash=?,credential_version=credential_version+1 WHERE id=?",passwords.encode(password),id);
            db.update("DELETE FROM password_reset_tokens WHERE user_id=?",id);
        });
    }
    private static ApiException invalid(){return new ApiException(HttpStatus.BAD_REQUEST,"This reset link is invalid or expired. Request a new link.");}
}

@RestController @RequestMapping("/api/auth")
class PasswordRecoveryController {
    private final PasswordRecovery recovery;
    PasswordRecoveryController(PasswordRecovery recovery){this.recovery=recovery;}
    record Forgot(@NotBlank @Email @Size(max=254)String email){}
    record Reset(@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{43}")String token,@NotBlank @Size(min=12,max=72)String password){}
    @PostMapping("/forgot-password") @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String,String> forgot(@Valid @RequestBody Forgot r){recovery.request(r.email());return Map.of("message","If an active account matches that email, a reset link will be sent. Check your inbox and spam folder.");}
    @PostMapping("/reset-password")
    public Map<String,String> reset(@Valid @RequestBody Reset r){recovery.reset(r.token(),r.password());return Map.of("message","Password updated. Sign in with your new password.");}
}
