package com.xpertsedge.lms.users;

import com.xpertsedge.lms.auth.IdentityService;
import com.xpertsedge.lms.domain.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import java.util.List;
import java.util.UUID;
import com.xpertsedge.lms.common.ApiException;
import org.springframework.transaction.annotation.Transactional;

@RestController @RequestMapping("/api/admin/users")
public class AdminUsersController {
    private final UserRepository users;
    private final IdentityService identities;
    public AdminUsersController(UserRepository users,IdentityService identities){this.users=users;this.identities=identities;}
    public record CreateUser(@NotBlank @Size(min=2,max=100)String name,@NotBlank @Email @Size(max=254)String email,@NotBlank @Size(min=12,max=72)String password,@NotNull Role role){}
    public record UserView(UUID id,String name,String email,Role role,boolean enabled,java.time.Instant createdAt){
        static UserView of(AppUser u){return new UserView(u.getId(),u.getName(),u.getEmail(),u.getRole(),u.isEnabled(),u.getCreatedAt());}
    }
    public record UpdateUser(@NotBlank @Size(min=2,max=100)String name,@NotBlank @Email @Size(max=254)String email,@NotNull Boolean enabled){}
    @PutMapping("/{id}") @Transactional public UserView update(@PathVariable UUID id,@Valid @RequestBody UpdateUser r,Authentication auth){
        identities.current(auth);
        AppUser target=users.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Account not found."));
        if(target.getRole()==Role.ADMIN)throw new ApiException(HttpStatus.FORBIDDEN,"Administrator accounts cannot be changed through this directory.");
        String email=IdentityService.normalize(r.email());
        if(users.findByEmail(email).filter(u->!u.getId().equals(id)).isPresent())throw new ApiException(HttpStatus.CONFLICT,"This email is already registered.");
        target.updateProfile(r.name().strip(),email,r.enabled());
        return UserView.of(users.saveAndFlush(target));
    }
    @GetMapping public List<UserView> list(Authentication auth,@RequestParam(defaultValue="0")@Min(0)int page){
        identities.current(auth);return users.findAll(PageRequest.of(page,50,Sort.by("createdAt").descending())).stream().map(UserView::of).toList();
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public IdentityService.UserView create(@Valid @RequestBody CreateUser r,Authentication auth){
        identities.current(auth);return IdentityService.UserView.of(identities.create(r.name(),r.email(),r.password(),r.role()));
    }
}
