package com.bantads.mscliente.dto;

import java.math.BigDecimal;

public record ClienteResponse(String cpf, String nome, String email, String telefone, BigDecimal salario, EnderecoResponse endereco) {}
