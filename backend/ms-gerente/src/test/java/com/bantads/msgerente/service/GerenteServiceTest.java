package com.bantads.msgerente.service;

import com.bantads.msgerente.dto.GerenteRequest;
import com.bantads.msgerente.dto.GerenteResponse;
import com.bantads.msgerente.repository.GerenteRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
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
        GerenteRequest request = new GerenteRequest("98574307084", "Geniéve", "ger1@bantads.com.br", "41988880001");
        GerenteResponse esperado = new GerenteResponse("98574307084", "Geniéve", "ger1@bantads.com.br", "41988880001", true);

        when(repository.existePorCpf(request.cpf())).thenReturn(false);
        when(repository.existePorEmail(request.email())).thenReturn(false);
        when(repository.porCpf(request.cpf())).thenReturn(Optional.of(esperado));

        GerenteResponse resposta = service.inserir(request);

        assertEquals(esperado, resposta);
        verify(repository).inserir(request);
    }

    @Test
    void deveRejeitarInsercaoComEmailDuplicado() {
        GerenteRequest request = new GerenteRequest("98574307084", "Geniéve", "ger1@bantads.com.br", "41988880001");
        when(repository.existePorCpf(request.cpf())).thenReturn(false);
        when(repository.existePorEmail(request.email())).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.inserir(request));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void deveAtualizarNomeETelefoneDoGerenteAtivo() {
        GerenteResponse atualizado = new GerenteResponse("98574307084", "Geniéve Silva", "ger1@bantads.com.br", "41999990000", true);
        when(repository.atualizar("98574307084", "Geniéve Silva", "41999990000")).thenReturn(1);
        when(repository.porCpf("98574307084")).thenReturn(Optional.of(atualizado));

        GerenteResponse resposta = service.atualizar("98574307084", "  Geniéve Silva  ", "41999990000");

        assertEquals("Geniéve Silva", resposta.nome());
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
        when(repository.desativar("00000000000")).thenReturn(0);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.desativar("00000000000")
        );
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }
}

