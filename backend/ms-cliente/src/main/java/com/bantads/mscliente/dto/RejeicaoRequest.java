package com.bantads.mscliente.dto;

import jakarta.validation.constraints.NotBlank;

public record RejeicaoRequest(@NotBlank String motivo) {}
