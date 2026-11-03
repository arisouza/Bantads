package com.bantads.ms_auth.service;

import com.bantads.ms_auth.model.Usuario;
import com.bantads.ms_auth.repository.UsuarioRepository;
import de.mkammerer.argon2.Argon2Factory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.util.List;

@Service
public class AuthService {
    private final UsuarioRepository usuarios;

    /** Hash distribuído pelo seed original, usado apenas para migração. */
    private static final String HASH_SEED_LEGADO = "$argon2id$v=19$m=19456,t=2,p=1$I/uDJP8rQ8G7VcdjsGj6yg$hfVDzW7NkVMRWxf6CLMNxIEIx1wD1EmDLC0eT7rkt1s";
    /** Hash usado por uma versão anterior do volume de demonstração. */
    private static final String HASH_SEED_ANTERIOR = "$argon2id$v=19$m=16384,t=2,p=1$c2FsdHNhbHRzYWx0$LqV9aQZJ1Z2W8+tE3Z+iX/T2z3B7lQoXmJ4hXjD7wYk";
    private static final String SENHA_SEED = "tads";

    private static final List<Object[]> SEED = List.of(
        new Object[]{"12912861012", "cli1@bantads.com.br", "CLIENTE"},
        new Object[]{"09506382000", "cli2@bantads.com.br", "CLIENTE"},
        new Object[]{"85733854057", "cli3@bantads.com.br", "CLIENTE"},
        new Object[]{"58872160006", "cli4@bantads.com.br", "CLIENTE"},
        new Object[]{"76179646090", "cli5@bantads.com.br", "CLIENTE"},
        new Object[]{"98574307084", "ger1@bantads.com.br", "GERENTE"},
        new Object[]{"64065268052", "ger2@bantads.com.br", "GERENTE"},
        new Object[]{"23862179060", "ger3@bantads.com.br", "GERENTE"},
        new Object[]{"40501740066", "ger4@bantads.com.br", "GERENTE"}
    );

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

    public record CriarUsuarioCmd(String cpf, String email, String senha, String tipo) {}
    public record CriarUsuarioResult(String cpf, String senha) {}

    public CriarUsuarioResult criarUsuario(CriarUsuarioCmd cmd) {
        if (usuarios.existsByEmail(cmd.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail já cadastrado");
        }

        String senhaFinal = (cmd.senha() != null && !cmd.senha().isBlank())
            ? cmd.senha()
            : gerarSenhaAleatoria();

        String hash = hashSenha(senhaFinal);

        var u = new Usuario(cmd.cpf(), cmd.email(), hash, cmd.tipo(), true);
        usuarios.save(u);
        return new CriarUsuarioResult(cmd.cpf(), senhaFinal);
    }

    public void desativarUsuario(String cpf) {
        var u = usuarios.findByCpf(cpf)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        u.setAtivo(false);
        usuarios.save(u);
    }

    public void reativarUsuario(String cpf) {
        usuarios.findByCpf(cpf).ifPresent(u -> {
            u.setAtivo(true);
            usuarios.save(u);
        });
    }

    public void removerUsuario(String cpf) {
        usuarios.findByCpf(cpf).ifPresent(usuarios::delete);
    }

    public void reboot() {
        usuarios.deleteAll();
        for (var row : SEED) {
            var u = new Usuario((String) row[0], (String) row[1], hashSenha(SENHA_SEED), (String) row[2], true);
            usuarios.save(u);
        }
    }

    /**
     * Corrige somente os usuários carregados com o hash de seed legado.
     * Senhas criadas ou alteradas por usuários nunca são substituídas.
     */
    public int migrarHashesSeedLegados() {
        int migrados = 0;
        for (Usuario usuario : usuarios.findAll()) {
            if (!ehHashSeedLegado(usuario.getSenha())) continue;
            usuario.setSenha(hashSenha(SENHA_SEED));
            usuarios.save(usuario);
            migrados++;
        }
        return migrados;
    }

    private String gerarSenhaAleatoria() {
        var chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        var rng = new SecureRandom();
        var sb = new StringBuilder(10);
        for (int i = 0; i < 10; i++) sb.append(chars.charAt(rng.nextInt(chars.length())));
        return sb.toString();
    }

    private String hashSenha(String senha) {
        var argon = Argon2Factory.create(Argon2Factory.Argon2Types.ARGON2id);
        char[] password = senha.toCharArray();
        try {
            return argon.hash(2, 19456, 1, password);
        } finally {
            argon.wipeArray(password);
        }
    }

    private boolean ehHashSeedLegado(String hash) {
        return HASH_SEED_LEGADO.equals(hash) || HASH_SEED_ANTERIOR.equals(hash);
    }
}
