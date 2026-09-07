package com.bantads.ms_auth.service;

import com.bantads.ms_auth.repository.UsuarioRepository;
import de.mkammerer.argon2.Argon2Factory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
    private final UsuarioRepository usuarios;

    public AuthService(UsuarioRepository usuarios) { this.usuarios = usuarios; }

    public record Identidade(String cpf, String tipo) {}

    public Identidade autenticar(String email, String senha) {
        var usuario = usuarios.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (!usuario.isAtivo()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);

        var argon = Argon2Factory.create(Argon2Factory.Argon2Types.ARGON2id);
        char[] password = senha.toCharArray();
        try {
            if (!argon.verify(usuario.getSenha(), password)) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
            }
            return new Identidade(usuario.getCpf(), usuario.getTipo());
        } finally {
            argon.wipeArray(password);
        }
    }
}
