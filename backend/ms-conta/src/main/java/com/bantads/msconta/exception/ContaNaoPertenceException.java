package com.bantads.msconta.exception;

public class ContaNaoPertenceException extends RuntimeException {

    public ContaNaoPertenceException() {
        super("A conta não pertence ao usuário autenticado");
    }
}
