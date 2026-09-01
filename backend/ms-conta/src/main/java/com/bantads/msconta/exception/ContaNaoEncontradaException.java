package com.bantads.msconta.exception;

public class ContaNaoEncontradaException extends RuntimeException {

    public ContaNaoEncontradaException(String numeroConta) {
        super("Conta " + numeroConta + " não encontrada");
    }
}
