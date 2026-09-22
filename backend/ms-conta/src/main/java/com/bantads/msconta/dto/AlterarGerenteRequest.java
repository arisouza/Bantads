package com.bantads.msconta.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;

public class AlterarGerenteRequest {

    @NotBlank
    @JsonAlias({"cpfGerenteNovo", "cpf_gerente_novo"})
    private String cpfGerenteNovo;

    public AlterarGerenteRequest() {
    }

    public String getCpfGerenteNovo() {
        return cpfGerenteNovo;
    }

    public void setCpfGerenteNovo(String cpfGerenteNovo) {
        this.cpfGerenteNovo = cpfGerenteNovo;
    }
}
