package com.bantads.mscliente.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record SolicitacaoResponse(String cpf, String nome, String email, String telefone, BigDecimal salario, EnderecoResponse endereco, String status, String motivoRejeicao, OffsetDateTime criadoEm) {}
