package com.bantads.msconta.exception;

public class ContaJaExistenteException extends RuntimeException {

    public ContaJaExistenteException(String cpfCliente) {
        super("O cliente " + cpfCliente + " já possui conta");
    }
}
