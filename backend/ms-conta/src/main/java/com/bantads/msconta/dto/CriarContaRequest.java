package com.bantads.msconta.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;

import java.util.ArrayList;
import java.util.List;

public class CriarContaRequest {

    @NotBlank
    @JsonAlias({"cpf_cliente", "cpfCliente"})
    private String cpfCliente;

    @JsonAlias({"cpfsGerentesAtivos", "gerentesAtivos"})
    private List<String> cpfsGerentesAtivos = new ArrayList<>();

    public CriarContaRequest() {
    }

    public String getCpfCliente() {
        return cpfCliente;
    }

    public void setCpfCliente(String cpfCliente) {
        this.cpfCliente = cpfCliente;
    }

    public List<String> getCpfsGerentesAtivos() {
        return cpfsGerentesAtivos;
    }

    public void setCpfsGerentesAtivos(List<String> cpfsGerentesAtivos) {
        this.cpfsGerentesAtivos = cpfsGerentesAtivos;
    }
}
