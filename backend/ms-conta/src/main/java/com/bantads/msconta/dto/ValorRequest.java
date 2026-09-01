package com.bantads.msconta.dto;

import jakarta.validation.constraints.NotBlank;

public class ValorRequest {

    @NotBlank
    private String valor;

    public ValorRequest() {
    }

    public String getValor() {
        return valor;
    }

    public void setValor(String valor) {
        this.valor = valor;
    }
}
