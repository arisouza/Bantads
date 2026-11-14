package com.bantads.ms_auth.service;

import com.bantads.ms_auth.model.Usuario;
import com.bantads.ms_auth.repository.UsuarioRepository;
import de.mkammerer.argon2.Argon2Factory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UsuarioRepository usuarios;

    private AuthService service;

    @BeforeEach
    void setUp() {
        service = new AuthService(usuarios);
    }

    @Test
    void deveAutenticarUsuarioAtivoComSenhaCorreta() {
        String hash = Argon2Factory.create(Argon2Factory.Argon2Types.ARGON2id)
                .hash(2, 19456, 1, "tads".toCharArray());
        Usuario usuario = new Usuario("12912861012", "cli1@bantads.com.br", hash, "CLIENTE", true);
        when(usuarios.findByEmail("cli1@bantads.com.br")).thenReturn(Optional.of(usuario));

        AuthService.Identidade identidade = service.autenticar("cli1@bantads.com.br", "tads");

        assertEquals("12912861012", identidade.cpf());
        assertEquals("CLIENTE", identidade.tipo());
    }

    @Test
    void deveRecusarUsuarioInativo() {
        String hash = Argon2Factory.create(Argon2Factory.Argon2Types.ARGON2id)
                .hash(2, 19456, 1, "tads".toCharArray());
        Usuario usuario = new Usuario("98574307084", "ger1@bantads.com.br", hash, "GERENTE", false);
        when(usuarios.findByEmail("ger1@bantads.com.br")).thenReturn(Optional.of(usuario));

        assertThrows(
                ResponseStatusException.class,
                () -> service.autenticar("ger1@bantads.com.br", "tads")
        );
    }

    @Test
    void deveRecusarCriacaoComEmailDuplicado() {
        when(usuarios.existsByEmail("cli1@bantads.com.br")).thenReturn(true);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.criarUsuario(new AuthService.CriarUsuarioCmd(
                        "12345678901",
                        "cli1@bantads.com.br",
                        "senha123",
                        "CLIENTE"
                ))
        );

        assertEquals(409, ex.getStatusCode().value());
    }

    @Test
    void deveCriarUsuarioComSenhaInformada() {
        when(usuarios.existsByEmail("novo@bantads.com.br")).thenReturn(false);
        when(usuarios.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthService.CriarUsuarioResult resultado = service.criarUsuario(
                new AuthService.CriarUsuarioCmd("11122233344", "novo@bantads.com.br", "senhaFixa", "CLIENTE")
        );

        assertEquals("11122233344", resultado.cpf());
        assertEquals("senhaFixa", resultado.senha());
        verify(usuarios).save(any(Usuario.class));
    }

    @Test
    void deveDesativarUsuarioExistente() {
        Usuario usuario = new Usuario("98574307084", "ger1@bantads.com.br", "hash", "GERENTE", true);
        when(usuarios.findByCpf("98574307084")).thenReturn(Optional.of(usuario));
        when(usuarios.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.desativarUsuario("98574307084");

        assertTrue(!usuario.isAtivo());
        verify(usuarios).save(usuario);
    }
}
