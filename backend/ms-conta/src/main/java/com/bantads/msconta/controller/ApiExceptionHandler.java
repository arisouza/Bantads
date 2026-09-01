package com.bantads.msconta.controller;

import com.bantads.msconta.dto.MensagemResponse;
import com.bantads.msconta.exception.ConflitoVersaoException;
import com.bantads.msconta.exception.ContaNaoEncontradaException;
import com.bantads.msconta.exception.ContaNaoPertenceException;
import com.bantads.msconta.exception.SaldoInsuficienteException;
import com.bantads.msconta.exception.ValorInvalidoException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ContaNaoEncontradaException.class)
    public ResponseEntity<MensagemResponse> naoEncontrada(ContaNaoEncontradaException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new MensagemResponse(ex.getMessage()));
    }

    @ExceptionHandler(ContaNaoPertenceException.class)
    public ResponseEntity<MensagemResponse> naoPertence(ContaNaoPertenceException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new MensagemResponse(ex.getMessage()));
    }

    @ExceptionHandler({ValorInvalidoException.class, SaldoInsuficienteException.class})
    public ResponseEntity<MensagemResponse> requisicaoInvalida(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new MensagemResponse(ex.getMessage()));
    }

    @ExceptionHandler(ConflitoVersaoException.class)
    public ResponseEntity<MensagemResponse> conflito(ConflitoVersaoException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new MensagemResponse(ex.getMessage()));
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<MensagemResponse> headerAusente(MissingRequestHeaderException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new MensagemResponse("Header obrigatório ausente: " + ex.getHeaderName()));
    }
}
