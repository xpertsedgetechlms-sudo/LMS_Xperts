package com.xpertsedge.lms.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import java.net.URI;

@Component
public class RecoveryMail {
    private final boolean enabled;
    private final String from,baseUrl;
    private final JavaMailSenderImpl sender=new JavaMailSenderImpl();
    public RecoveryMail(@Value("${lms.recovery.enabled:false}")boolean enabled,
        @Value("${lms.recovery.base-url:}")String baseUrl,
        @Value("${lms.recovery.from:}")String from,
        @Value("${lms.recovery.smtp-host:}")String host,
        @Value("${lms.recovery.smtp-port:587}")int port,
        @Value("${lms.recovery.smtp-user:}")String username,
        @Value("${lms.recovery.smtp-password:}")String password){
        this.enabled=enabled;this.from=from;this.baseUrl=baseUrl.replaceAll("/+$","");
        if(enabled){
            URI uri=URI.create(this.baseUrl);
            boolean local="http".equals(uri.getScheme())&&("localhost".equals(uri.getHost())||"127.0.0.1".equals(uri.getHost()));
            if((!"https".equals(uri.getScheme())&&!local)||uri.getHost()==null||uri.getRawQuery()!=null||uri.getRawFragment()!=null||uri.getUserInfo()!=null||!uri.getPath().isEmpty()||host.isBlank()||!from.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))throw new IllegalStateException("Configure a valid recovery origin, SMTP host and sender before enabling recovery.");
        }
        sender.setHost(host);sender.setPort(port);sender.setUsername(username);sender.setPassword(password);
        var p=sender.getJavaMailProperties();
        p.setProperty("mail.smtp.auth",String.valueOf(!username.isBlank()));
        p.setProperty("mail.smtp.starttls.enable","true");p.setProperty("mail.smtp.starttls.required","true");
        p.setProperty("mail.smtp.ssl.checkserveridentity","true");
        p.setProperty("mail.smtp.connectiontimeout","5000");p.setProperty("mail.smtp.timeout","5000");p.setProperty("mail.smtp.writetimeout","5000");
    }
    public boolean enabled(){return enabled;}
    public void notification(String email,String subject,String body){
        if(!enabled)throw new IllegalStateException("SMTP is not enabled.");
        var message=new SimpleMailMessage();message.setFrom(from);message.setTo(email);
        message.setSubject(subject.replaceAll("[\\r\\n]"," "));message.setText(body+"\n\nSign in to your learning portal: "+baseUrl+"\n\nXpertsEdge Technologies");
        sender.send(message);
    }
    public void send(String email,String token){
        var message=new SimpleMailMessage();message.setFrom(from);message.setTo(email);
        message.setSubject("Reset your XpertsEdge password");
        message.setText("A password reset was requested for your XpertsEdge account.\n\n"+baseUrl+"/#reset-password="+token+"\n\nThis link expires in 30 minutes and can be used once. If you did not request this, ignore this email. Your password has not changed.\n\nXpertsEdge Technologies");
        sender.send(message);
    }
}
