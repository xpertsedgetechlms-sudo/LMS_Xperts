package com.xpertsedge.lms.learning;

import com.xpertsedge.lms.auth.IdentityService;
import com.xpertsedge.lms.domain.Role;
import com.xpertsedge.lms.common.ApiException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
public class CertificateDownloadController {
    private final JdbcTemplate db;private final IdentityService identities;private final CourseAccess access;private final CertificatePdf pdf;
    public CertificateDownloadController(JdbcTemplate db,IdentityService identities,CourseAccess access,CertificatePdf pdf){this.db=db;this.identities=identities;this.access=access;this.pdf=pdf;}
    @GetMapping("/api/workspace/learning/certificates/{id}/pdf")
    public ResponseEntity<byte[]> download(@PathVariable UUID id,Authentication auth)throws java.io.IOException{
        var user=identities.current(auth);var rows=db.queryForList("SELECT * FROM completion_certificates WHERE id=?",id);
        if(rows.isEmpty())throw new ApiException(HttpStatus.NOT_FOUND,"Certificate not found.");var row=rows.getFirst();
        access.require(user.getRole()==Role.ADMIN||(user.getRole()==Role.STUDENT?user.getId().equals(row.get("student_id")):access.read(user,row.get("course_id").toString())));
        if(Boolean.TRUE.equals(row.get("revoked")))throw new ApiException(HttpStatus.CONFLICT,"This certificate has been revoked. Contact the institute.");
        var issued=db.queryForObject("SELECT issued_at FROM completion_certificates WHERE id=?",(rs,n)->rs.getTimestamp(1).toInstant(),id);
        try{
            byte[] bytes=pdf.create(row.get("student_name").toString(),row.get("course_name").toString(),row.get("code").toString(),issued,false);
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\""+row.get("code")+".pdf\"").header(HttpHeaders.CACHE_CONTROL,"no-store").body(bytes);
        }catch(IllegalArgumentException e){throw new ApiException(HttpStatus.BAD_REQUEST,"This certificate name contains characters not supported by the PDF font. Contact the institute for a reviewed certificate.");}
    }
}
