package com.bantads.msconta.dto;

import org.springframework.hateoas.RepresentationModel;

public class SaldoResponse extends RepresentationModel<SaldoResponse> {

    private String numeroConta;
    private String cpfCliente;
    private String saldo;

    public SaldoResponse() {
    }

    public SaldoResponse(String numeroConta, String cpfCliente, String saldo) {
        this.numeroConta = numeroConta;
        this.cpfCliente = cpfCliente;
        this.saldo = saldo;
    }

    public String getNumeroConta() {
        return numeroConta;
    }

    public void setNumeroConta(String numeroConta) {
        this.numeroConta = numeroConta;
    }

    public String getCpfCliente() {
        return cpfCliente;
    }

    public void setCpfCliente(String cpfCliente) {
        this.cpfCliente = cpfCliente;
    }

    public String getSaldo() {
        return saldo;
    }

    public void setSaldo(String saldo) {
        this.saldo = saldo;
    }
}
