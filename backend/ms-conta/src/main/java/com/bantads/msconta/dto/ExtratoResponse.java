package com.bantads.msconta.dto;

import org.springframework.hateoas.RepresentationModel;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

public class ExtratoResponse extends RepresentationModel<ExtratoResponse> {

    private String numeroConta;
    private OffsetDateTime inicio;
    private OffsetDateTime fim;
    private String saldoAbertura;
    private List<MovimentacaoResponse> movimentacoes = new ArrayList<>();

    public ExtratoResponse() {
    }

    public String getNumeroConta() {
        return numeroConta;
    }

    public void setNumeroConta(String numeroConta) {
        this.numeroConta = numeroConta;
    }

    public OffsetDateTime getInicio() {
        return inicio;
    }

    public void setInicio(OffsetDateTime inicio) {
        this.inicio = inicio;
    }

    public OffsetDateTime getFim() {
        return fim;
    }

    public void setFim(OffsetDateTime fim) {
        this.fim = fim;
    }

    public String getSaldoAbertura() {
        return saldoAbertura;
    }

    public void setSaldoAbertura(String saldoAbertura) {
        this.saldoAbertura = saldoAbertura;
    }

    public List<MovimentacaoResponse> getMovimentacoes() {
        return movimentacoes;
    }

    public void setMovimentacoes(List<MovimentacaoResponse> movimentacoes) {
        this.movimentacoes = movimentacoes;
    }
}
