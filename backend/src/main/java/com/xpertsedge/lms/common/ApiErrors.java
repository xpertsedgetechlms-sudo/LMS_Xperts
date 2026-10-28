package com.xpertsedge.lms.common;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import java.time.Instant;
import java.util.*;

@RestControllerAdvice
public class ApiErrors {
    record ErrorBody(Instant timestamp,int status,String message,Map<String,String> fields){}
    private ResponseEntity<ErrorBody> error(HttpStatus status,String message,Map<String,String> fields){return ResponseEntity.status(status).body(new ErrorBody(Instant.now(),status.value(),message,fields));}
    @ExceptionHandler({org.springframework.web.method.annotation.HandlerMethodValidationException.class,jakarta.validation.ConstraintViolationException.class})
    ResponseEntity<ErrorBody> parameterValidation(Exception e){return error(HttpStatus.BAD_REQUEST,"Check the query parameter values.",Map.of());}
    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ErrorBody> unsupportedMethod(Exception e){return error(HttpStatus.METHOD_NOT_ALLOWED,"This action is not supported for this endpoint.",Map.of());}
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    ResponseEntity<ErrorBody> uploadSize(Exception e){return error(HttpStatus.PAYLOAD_TOO_LARGE,"Choose a file up to 20 MB.",Map.of());}
    @ExceptionHandler(ApiException.class)
    ResponseEntity<ErrorBody> app(ApiException e){return error(e.status(),e.getMessage(),Map.of());}
    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<ErrorBody> auth(AuthenticationException e){return error(HttpStatus.UNAUTHORIZED,"Email or password is incorrect.",Map.of());}
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorBody> validation(MethodArgumentNotValidException e){
        Map<String,String> fields=new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors().forEach(f->fields.putIfAbsent(f.getField(),f.getDefaultMessage()));
        return error(HttpStatus.BAD_REQUEST,"Check the submitted fields.",fields);
    }
    @ExceptionHandler({HttpMessageNotReadableException.class,MethodArgumentTypeMismatchException.class})
    ResponseEntity<ErrorBody> malformed(Exception e){return error(HttpStatus.BAD_REQUEST,"Invalid request fields or JSON.",Map.of());}
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ErrorBody> duplicate(DataIntegrityViolationException e){return error(HttpStatus.CONFLICT,"The record already exists or references an invalid record.",Map.of());}
}
