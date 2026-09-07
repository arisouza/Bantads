package com.bantads.ms_auth.controller;

import com.bantads.ms_auth.service.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthService auth;

    public AuthController(AuthService auth) { this.auth = auth; }

    public record Credenciais(@NotBlank @Email String email, @NotBlank String senha) {}

    @PostMapping("/login")
    public AuthService.Identidade login(@Valid @RequestBody Credenciais body) {
        return auth.autenticar(body.email(), body.senha());
    }
}
