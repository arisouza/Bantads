package com.bantads.mscliente.dto;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

public record SolicitacaoResponse(
        String cpf,
        String nome,
        String email,
        String telefone,
        @JsonSerialize(using = MoedaSerializer.class) BigDecimal salario,
        EnderecoResponse endereco,
        String status,
        String motivoRejeicao,
        OffsetDateTime criadoEm,
        OffsetDateTime atualizadoEm,
        Map<String, Map<String, String>> _links
) {
    public SolicitacaoResponse(
            String cpf,
            String nome,
            String email,
            String telefone,
            BigDecimal salario,
            EnderecoResponse endereco,
            String status,
            String motivoRejeicao,
            OffsetDateTime criadoEm,
            OffsetDateTime atualizadoEm
    ) {
        this(cpf, nome, email, telefone, salario, endereco, status, motivoRejeicao, criadoEm, atualizadoEm, linksPadrao(cpf, status));
    }

    private static Map<String, Map<String, String>> linksPadrao(String cpf, String status) {
        String base = "/clientes/solicitacoes/" + cpf;
        Map<String, Map<String, String>> links = new LinkedHashMap<>();
        links.put("self", Map.of("href", base));
        if ("PENDENTE".equalsIgnoreCase(status)) {
            links.put("aprovacao", Map.of("href", base + "/aprovacao"));
            links.put("rejeicao", Map.of("href", base + "/rejeicao"));
        }
        return Map.copyOf(links);
    }
}
