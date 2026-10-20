package com.bantads.msgerente.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> regraDeNegocio(ResponseStatusException ex, HttpServletRequest request) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        return resposta(status, ex.getReason() == null ? status.getReasonPhrase() : ex.getReason(), request, Map.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> corpoInvalido(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> campos = new LinkedHashMap<>();
        for (FieldError erro : ex.getBindingResult().getFieldErrors()) {
            campos.putIfAbsent(erro.getField(), erro.getDefaultMessage());
        }
        return resposta(HttpStatus.BAD_REQUEST, "Dados de entrada invÃ¡lidos", request, campos);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> parametroInvalido(ConstraintViolationException ex, HttpServletRequest request) {
        Map<String, String> campos = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(erro -> campos.put(erro.getPropertyPath().toString(), erro.getMessage()));
        return resposta(HttpStatus.BAD_REQUEST, "ParÃ¢metros invÃ¡lidos", request, campos);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> jsonInvalido(HttpServletRequest request) {
        return resposta(HttpStatus.BAD_REQUEST, "JSON invÃ¡lido ou malformado", request, Map.of());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> conflitoDeDados(HttpServletRequest request) {
        return resposta(HttpStatus.CONFLICT, "CPF ou e-mail jÃ¡ cadastrado", request, Map.of());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> erroInesperado(Exception ex, HttpServletRequest request) {
        return resposta(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno do serviÃ§o", request, Map.of());
    }

    private ResponseEntity<ApiError> resposta(HttpStatus status, String mensagem, HttpServletRequest request, Map<String, String> campos) {
        ApiError body = new ApiError(OffsetDateTime.now(), status.value(), status.getReasonPhrase(), mensagem, request.getRequestURI(), campos);
        return ResponseEntity.status(status).body(body);
    }

    public record ApiError(
            OffsetDateTime timestamp,
            int status,
            String erro,
            String mensagem,
            String caminho,
            Map<String, String> campos
    ) {}
}
