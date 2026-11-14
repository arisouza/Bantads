package com.bantads.msgerente.messaging;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.bantads.msgerente.dto.GerenteRequest;
import com.bantads.msgerente.dto.GerenteResponse;
import com.bantads.msgerente.service.GerenteService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class GerenteSagaConsumerTest {

    @Mock
    private GerenteService service;

    @Mock
    private ComandoDedupe dedupe;

    @Mock
    private RabbitTemplate rabbit;

    private ObjectMapper mapper;
    private GerenteSagaConsumer consumer;

    @BeforeEach
    void setUp() {
        mapper = new ObjectMapper();
        consumer = new GerenteSagaConsumer(service, dedupe, rabbit, mapper);
    }

    @Test
    void deveIgnorarComandoDuplicado() throws Exception {
        when(dedupe.jaProcessado("saga-g1", "CREATE_GERENTE")).thenReturn(true);
        String msg = mapper.writeValueAsString(Map.of(
                "sagaId", "saga-g1",
                "action", "CREATE_GERENTE",
                "data", Map.of("cpf", "98574307084")
        ));

        consumer.consumir(msg);

        verify(service, never()).inserir(any());
        verify(rabbit, never()).convertAndSend(anyString(), anyString());
    }

    @Test
    void deveCriarGerenteERetornarGerenteCreated() throws Exception {
        when(dedupe.jaProcessado("saga-g2", "CREATE_GERENTE")).thenReturn(false);
        GerenteResponse criado = new GerenteResponse(
                "98574307084",
                "Geniéve",
                "ger1@bantads.com.br",
                "41988880001",
                true
        );
        when(service.inserir(any(GerenteRequest.class))).thenReturn(criado);

        String msg = mapper.writeValueAsString(Map.of(
                "sagaId", "saga-g2",
                "action", "CREATE_GERENTE",
                "data", Map.of(
                        "cpf", "98574307084",
                        "nome", "Geniéve",
                        "email", "ger1@bantads.com.br",
                        "telefone", "41988880001"
                )
        ));

        consumer.consumir(msg);

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(rabbit).convertAndSend(eq("orquestrador.reply"), captor.capture());
        verify(dedupe).registrar("saga-g2", "CREATE_GERENTE");

        Map<?, ?> reply = mapper.readValue(captor.getValue(), Map.class);
        assertEquals("GERENTE_CREATED", reply.get("tipo"));
    }

    @Test
    void deveInativarEReativarGerenteViaComandosSaga() throws Exception {
        when(dedupe.jaProcessado("saga-g3", "INACTIVATE_GERENTE")).thenReturn(false);
        when(dedupe.jaProcessado("saga-g3", "REACTIVATE_GERENTE")).thenReturn(false);

        String inativar = mapper.writeValueAsString(Map.of(
                "sagaId", "saga-g3",
                "action", "INACTIVATE_GERENTE",
                "data", Map.of("cpf", "98574307084")
        ));
        String reativar = mapper.writeValueAsString(Map.of(
                "sagaId", "saga-g3",
                "action", "REACTIVATE_GERENTE",
                "data", Map.of("cpf", "98574307084")
        ));

        consumer.consumir(inativar);
        consumer.consumir(reativar);

        verify(service).desativar("98574307084");
        verify(service).reativar("98574307084");
    }

    @Test
    void deveRetornarGerenteInactivateFailedQuandoDesativacaoFalha() throws Exception {
        when(dedupe.jaProcessado("saga-g4", "INACTIVATE_GERENTE")).thenReturn(false);
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Gerente não encontrado"))
                .when(service).desativar("00000000000");

        String msg = mapper.writeValueAsString(Map.of(
                "sagaId", "saga-g4",
                "action", "INACTIVATE_GERENTE",
                "data", Map.of("cpf", "00000000000")
        ));

        consumer.consumir(msg);

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(rabbit).convertAndSend(eq("orquestrador.reply"), captor.capture());
        Map<?, ?> reply = mapper.readValue(captor.getValue(), Map.class);
        assertEquals("GERENTE_INACTIVATE_FAILED", reply.get("tipo"));
    }
}
