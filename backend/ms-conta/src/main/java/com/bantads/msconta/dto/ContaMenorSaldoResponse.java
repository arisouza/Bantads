package com.bantads.msconta.dto;

import org.springframework.hateoas.RepresentationModel;

public class ContaMenorSaldoResponse extends RepresentationModel<ContaMenorSaldoResponse> {

    private String cpfGerente;
    private ContaResponse conta;
    private boolean semConta;

    public ContaMenorSaldoResponse() {
    }

    public String getCpfGerente() {
        return cpfGerente;
    }

    public void setCpfGerente(String cpfGerente) {
        this.cpfGerente = cpfGerente;
    }

    public ContaResponse getConta() {
        return conta;
    }

    public void setConta(ContaResponse conta) {
        this.conta = conta;
    }

    public boolean isSemConta() {
        return semConta;
    }

    public void setSemConta(boolean semConta) {
        this.semConta = semConta;
    }
}
