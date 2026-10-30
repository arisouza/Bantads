package com.bantads.msgerente.service;

import com.bantads.msgerente.domain.Gerente;
import com.bantads.msgerente.dto.GerenteRequest;
import com.bantads.msgerente.dto.GerenteResponse;
import com.bantads.msgerente.repository.GerenteRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GerenteServiceTest {

    @Mock
    private GerenteRepository repository;

    private GerenteService service;

    @BeforeEach
    void setUp() {
        service = new GerenteService(repository);
    }

    @Test
    void deveInserirGerenteQuandoCpfEEmailSaoUnicos() {
        GerenteRequest request = new GerenteRequest("98574307084", "GeniÃ©ve", "ger1@bantads.com.br", "41988880001");
        Gerente entidade = new Gerente("98574307084", "GeniÃ©ve", "ger1@bantads.com.br", "41988880001", true);

        when(repository.existsById(request.cpf())).thenReturn(false);
        when(repository.existsByEmail(request.email())).thenReturn(false);
        when(repository.save(any(Gerente.class))).thenReturn(entidade);

        GerenteResponse resposta = service.inserir(request);

        assertEquals(request.cpf(), resposta.cpf());
        assertEquals(request.nome(), resposta.nome());
        assertNotNull(resposta._links().get("self"));
        verify(repository).save(any(Gerente.class));
    }

    @Test
    void deveRejeitarInsercaoComEmailDuplicado() {
        GerenteRequest request = new GerenteRequest("98574307084", "GeniÃ©ve", "ger1@bantads.com.br", "41988880001");
        when(repository.existsById(request.cpf())).thenReturn(false);
        when(repository.existsByEmail(request.email())).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.inserir(request));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void deveAtualizarNomeETelefoneDoGerenteAtivo() {
        Gerente existente = new Gerente("98574307084", "GeniÃ©ve", "ger1@bantads.com.br", "41988880001", true);
        when(repository.findByCpfAndAtivoTrue("98574307084")).thenReturn(Optional.of(existente));
        when(repository.save(any(Gerente.class))).thenAnswer(inv -> inv.getArgument(0));

        GerenteResponse resposta = service.atualizar("98574307084", "  GeniÃ©ve Silva  ", "41999990000");

        assertEquals("GeniÃ©ve Silva", resposta.nome());
        assertEquals("41999990000", resposta.telefone());
    }

    @Test
    void deveRejeitarAtualizacaoComNomeEmBranco() {
        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.atualizar("98574307084", "   ", "41999990000")
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void deveRetornarNaoEncontradoAoDesativarGerenteInexistente() {
        when(repository.findById("00000000000")).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.desativar("00000000000")
        );
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }
}
