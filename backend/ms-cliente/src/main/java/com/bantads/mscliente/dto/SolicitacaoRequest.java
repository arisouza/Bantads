package com.bantads.mscliente.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;

public record SolicitacaoRequest(
    @NotBlank String nome, @NotBlank @Email String email,
    @NotBlank @Pattern(regexp = "\\d{11}") String cpf,
    @NotBlank @Pattern(regexp = "\\d{10,11}") String telefone,
    @DecimalMin(value = "0.01") BigDecimal salario,
    @NotBlank String logradouro, @NotBlank String numero, String complemento,
    @NotBlank @Pattern(regexp = "\\d{8}") String cep,
    @NotBlank String cidade, @NotBlank @Pattern(regexp = "[A-Z]{2}") String uf
) {}
