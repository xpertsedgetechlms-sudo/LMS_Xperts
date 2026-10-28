package com.xpertsedge.lms.learning;

import com.xpertsedge.lms.auth.IdentityService;
import com.xpertsedge.lms.common.ApiException;
import com.xpertsedge.lms.domain.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import java.util.*;
import java.time.*;
import java.math.BigDecimal;

@RestController @RequestMapping("/api/workspace/fees")
public class FinanceController {
    private final JdbcTemplate db;
    private final IdentityService identities;
    private final CourseAccess access;
    private final UserRepository users;
    private final CourseRepository courses;
    private final Clock clock;
    public FinanceController(JdbcTemplate db,IdentityService identities,CourseAccess access,UserRepository users,CourseRepository courses,Clock clock){this.db=db;this.identities=identities;this.access=access;this.users=users;this.courses=courses;this.clock=clock;}
    private ApiException bad(String text){return new ApiException(HttpStatus.BAD_REQUEST,text);}
    private Map<String,Object> invoice(UUID id){return db.queryForList("SELECT * FROM fee_invoices WHERE id=? FOR UPDATE",id).stream().findFirst().orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Fee account not found."));}
    private BigDecimal paid(UUID id){return db.queryForObject("SELECT COALESCE(SUM(amount),0) FROM fee_receipts WHERE invoice_id=? AND voided=FALSE",BigDecimal.class,id);}
    private void admin(Authentication auth){access.require(identities.current(auth).getRole()==Role.ADMIN);}
    @GetMapping public Map<String,Object> fees(Authentication auth){AppUser u=identities.current(auth);access.require(u.getRole()!=Role.TRAINER);var invoices=db.queryForList("SELECT i.*,u.name AS student_name,c.name AS course_name FROM fee_invoices i JOIN app_users u ON u.id=i.student_id JOIN courses c ON c.id=i.course_id ORDER BY i.created_at DESC").stream().filter(i->u.getRole()==Role.ADMIN||u.getId().toString().equals(i.get("student_id").toString())).map(row->{Map<String,Object> result=new LinkedHashMap<>(row);BigDecimal paid=paid(UUID.fromString(row.get("id").toString()));result.put("paid",paid);result.put("balance",((BigDecimal)row.get("total")).subtract(paid));return result;}).toList();var receipts=db.queryForList("SELECT r.*,i.student_id,u.name AS student_name,c.name AS course_name FROM fee_receipts r JOIN fee_invoices i ON i.id=r.invoice_id JOIN app_users u ON u.id=i.student_id JOIN courses c ON c.id=i.course_id ORDER BY r.recorded_at DESC").stream().filter(r->u.getRole()==Role.ADMIN||u.getId().toString().equals(r.get("student_id").toString())).toList();return Map.of("invoices",invoices,"receipts",receipts,"onlinePaymentEnabled",false);}
    public record InvoiceInput(@NotNull UUID studentId,@NotBlank @Size(max=60)String courseId,@NotNull @DecimalMin("0.00") @Digits(integer=10,fraction=2)BigDecimal total,LocalDate dueOn){}
    @PostMapping @Transactional public Map<String,Object> create(@Valid @RequestBody InvoiceInput r,Authentication auth){admin(auth);AppUser student=users.findById(r.studentId()).orElseThrow(()->bad("Student not found."));if(student.getRole()!=Role.STUDENT)throw bad("Choose a student account.");if(!courses.existsById(r.courseId()))throw bad("Course not found.");UUID id=UUID.randomUUID();db.update("INSERT INTO fee_invoices(id,student_id,course_id,total,due_on,created_at) VALUES(?,?,?,?,?,?)",id,r.studentId(),r.courseId(),r.total(),r.dueOn(),OffsetDateTime.now(clock));return Map.of("id",id);}
    public record InvoiceUpdate(@NotNull @DecimalMin("0.00") @Digits(integer=10,fraction=2)BigDecimal total,LocalDate dueOn){}
    @PutMapping("/{id}") @Transactional public Map<String,Object> update(@PathVariable UUID id,@Valid @RequestBody InvoiceUpdate r,Authentication auth){admin(auth);invoice(id);if(r.total().compareTo(paid(id))<0)throw bad("Total cannot be less than recorded payments. Correct the receipt first.");db.update("UPDATE fee_invoices SET total=?,due_on=? WHERE id=?",r.total(),r.dueOn(),id);return Map.of("saved",true);}
    public record PaymentInput(@NotNull UUID invoiceId,@NotNull @DecimalMin("0.01") @Digits(integer=10,fraction=2)BigDecimal amount,@NotBlank @Size(max=120)String reference,@NotNull @Pattern(regexp="CASH|BANK|UPI|CARD")String method){}
    @PostMapping("/receipts") @Transactional public Map<String,Object> receipt(@Valid @RequestBody PaymentInput r,Authentication auth){AppUser u=identities.current(auth);access.require(u.getRole()==Role.ADMIN);var invoice=invoice(r.invoiceId());BigDecimal remaining=((BigDecimal)invoice.get("total")).subtract(paid(r.invoiceId()));if(r.amount().compareTo(remaining)>0)throw bad("Payment exceeds the current balance.");UUID id=UUID.randomUUID();db.update("INSERT INTO fee_receipts(id,invoice_id,amount,reference,method,recorded_by,recorded_at,voided) VALUES(?,?,?,?,?,?,?,FALSE)",id,r.invoiceId(),r.amount(),r.reference().strip(),r.method(),u.getId(),OffsetDateTime.now(clock));return Map.of("id",id);}
    public record VoidInput(@NotBlank @Size(max=1000)String reason){}
    @PutMapping("/receipts/{id}/void") @Transactional public Map<String,Object> voidReceipt(@PathVariable UUID id,@Valid @RequestBody VoidInput r,Authentication auth){AppUser u=identities.current(auth);access.require(u.getRole()==Role.ADMIN);var receipt=db.queryForList("SELECT invoice_id FROM fee_receipts WHERE id=?",id).stream().findFirst().orElseThrow(()->bad("Receipt not found."));invoice(UUID.fromString(receipt.get("invoice_id").toString()));db.update("UPDATE fee_receipts SET voided=TRUE,void_reason=?,voided_by=?,voided_at=? WHERE id=? AND voided=FALSE",r.reason().strip(),u.getId(),OffsetDateTime.now(clock),id);return Map.of("saved",true);}
}
