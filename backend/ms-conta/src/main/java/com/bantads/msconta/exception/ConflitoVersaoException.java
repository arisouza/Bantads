package com.bantads.msconta.exception;

public class ConflitoVersaoException extends RuntimeException {

    public ConflitoVersaoException() {
        super("Conflito de versão ao gravar evento. Tente novamente.");
    }
}
