package com.bantads.mscliente.messaging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.bantads.mscliente.dto.SolicitacaoResponse;
import com.bantads.mscliente.service.ClienteService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
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
class ClienteSagaConsumerTest {

    @Mock
    private ClienteService service;

    @Mock
    private ComandoDedupe dedupe;

    @Mock
    private RabbitTemplate rabbit;

    private ObjectMapper mapper;
    private ClienteSagaConsumer consumer;

    @BeforeEach
    void setUp() {
        mapper = new ObjectMapper();
        consumer = new ClienteSagaConsumer(service, dedupe, rabbit, mapper);
    }

    @Test
    void deveIgnorarComandoJaProcessado() throws Exception {
        when(dedupe.jaProcessado("saga-1", "CREATE_CLIENTE")).thenReturn(true);
        String msg = mapper.writeValueAsString(Map.of(
                "sagaId", "saga-1",
                "action", "CREATE_CLIENTE",
                "data", Map.of("cpf", "12912861012")
        ));

        consumer.consumir(msg);

        verify(service, never()).criarClienteDaSolicitacao(anyString());
        verify(rabbit, never()).convertAndSend(anyString(), anyString());
    }

    @Test
    void deveCriarClienteDaSolicitacaoERegistrarDedupe() throws Exception {
        when(dedupe.jaProcessado("saga-2", "CREATE_CLIENTE")).thenReturn(false);
        SolicitacaoResponse solicitacao = new SolicitacaoResponse(
                "12912861012",
                "Catharyna",
                "cli1@bantads.com.br",
                "41999990001",
                new BigDecimal("10000.00"),
                null,
                "APROVADA",
                null,
                OffsetDateTime.now(),
                OffsetDateTime.now()
        );
        when(service.criarClienteDaSolicitacao("12912861012")).thenReturn(solicitacao);

        String msg = mapper.writeValueAsString(Map.of(
                "sagaId", "saga-2",
                "action", "CREATE_CLIENTE",
                "data", Map.of("cpf", "12912861012")
        ));

        consumer.consumir(msg);

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(rabbit).convertAndSend(eq("orquestrador.reply"), captor.capture());
        verify(dedupe).registrar("saga-2", "CREATE_CLIENTE");

        Map<?, ?> reply = mapper.readValue(captor.getValue(), Map.class);
        assertThat(reply.get("sagaId")).isEqualTo("saga-2");
        assertThat(reply.get("tipo")).isEqualTo("CLIENTE_CREATED");
    }

    @Test
    void deveProcessarRollbackClienteComMotivo() throws Exception {
        when(dedupe.jaProcessado("saga-3", "ROLLBACK_CLIENTE")).thenReturn(false);
        String msg = mapper.writeValueAsString(Map.of(
                "sagaId", "saga-3",
                "action", "ROLLBACK_CLIENTE",
                "data", Map.of("cpf", "12912861012", "motivo", "E-mail já cadastrado")
        ));

        consumer.consumir(msg);

        verify(service).rollbackCliente("12912861012", "E-mail já cadastrado");
        verify(dedupe).registrar("saga-3", "ROLLBACK_CLIENTE");
    }

    @Test
    void devePublicarFalhaQuandoOcorreResponseStatusException() throws Exception {
        when(dedupe.jaProcessado("saga-4", "CREATE_CLIENTE")).thenReturn(false);
        when(service.criarClienteDaSolicitacao("12912861012"))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Cliente já existe"));

        String msg = mapper.writeValueAsString(Map.of(
                "sagaId", "saga-4",
                "action", "CREATE_CLIENTE",
                "data", Map.of("cpf", "12912861012")
        ));

        consumer.consumir(msg);

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(rabbit).convertAndSend(eq("orquestrador.reply"), captor.capture());
        Map<?, ?> reply = mapper.readValue(captor.getValue(), Map.class);
        assertThat(reply.get("tipo")).isEqualTo("CLIENTE_FAILED");
        assertThat(reply.get("erro")).isEqualTo("Cliente já existe");
    }
}
