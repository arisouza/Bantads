package com.bantads.msgerente.dto;

import java.util.Map;

public record GerenteResponse(
        String cpf,
        String nome,
        String email,
        String telefone,
        boolean ativo,
        Map<String, Map<String, String>> _links
) {
    public GerenteResponse(String cpf, String nome, String email, String telefone, boolean ativo) {
        this(cpf, nome, email, telefone, ativo, linksPadrao(cpf));
    }

    private static Map<String, Map<String, String>> linksPadrao(String cpf) {
        String base = "/gerentes/" + cpf;
        return Map.of(
                "self", Map.of("href", base),
                "atualizacao", Map.of("href", base),
                "remocao", Map.of("href", base)
        );
    }
}
