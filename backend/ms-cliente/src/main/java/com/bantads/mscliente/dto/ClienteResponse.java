package com.bantads.mscliente.dto;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import java.math.BigDecimal;
import java.util.Map;

public record ClienteResponse(
        String cpf,
        String nome,
        String email,
        String telefone,
        @JsonSerialize(using = MoedaSerializer.class) BigDecimal salario,
        EnderecoResponse endereco,
        Map<String, Map<String, String>> _links
) {
    public ClienteResponse(String cpf, String nome, String email, String telefone, BigDecimal salario, EnderecoResponse endereco) {
        this(cpf, nome, email, telefone, salario, endereco, linksPadrao(cpf));
    }

    private static Map<String, Map<String, String>> linksPadrao(String cpf) {
        String base = "/clientes/" + cpf;
        return Map.of(
                "self", Map.of("href", base),
                "conta", Map.of("href", base + "/conta")
        );
    }
}
