package com.bantads.msgerente.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record GerenteRequest(
        @NotBlank @Pattern(regexp = "\\d{11}", message = "deve conter 11 dígitos") String cpf,
        @NotBlank String nome,
        @NotBlank @Email String email,
        @Pattern(regexp = "^$|\\d{10,11}", message = "deve conter 10 ou 11 dígitos") String telefone
) {}
