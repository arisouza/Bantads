package com.bantads.msconta.service;

import com.bantads.msconta.domain.entity.Conta;
import com.bantads.msconta.domain.entity.EventStore;
import com.bantads.msconta.domain.event.TipoEventoEnum;
import com.bantads.msconta.repository.event.EventStoreRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContaReplayServiceTest {

    @Mock
    private EventStoreRepository eventStoreRepository;

    private ContaReplayService contaReplayService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        contaReplayService = new ContaReplayService(eventStoreRepository, objectMapper);
    }

    @Test
    void deveReconstruirSaldoCorretamentePorReplayDosEventos() {
        String numeroConta = "1291";
        OffsetDateTime agora = OffsetDateTime.now();

        List<EventStore> eventos = List.of(
                new EventStore(UUID.randomUUID(), numeroConta, TipoEventoEnum.CRIADO.getValor(), 1, agora,
                        "{\"numeroConta\":\"1291\",\"cpfCliente\":\"12912861012\",\"cpfGerente\":\"98574307084\",\"dataCriacao\":\"2026-01-01T00:00:00Z\"}"),
                new EventStore(UUID.randomUUID(), numeroConta, TipoEventoEnum.DEPOSITO.getValor(), 2, agora,
                        "{\"valor\":\"1000.00\"}"),
                new EventStore(UUID.randomUUID(), numeroConta, TipoEventoEnum.SAQUE.getValor(), 3, agora,
                        "{\"valor\":\"350.00\"}"),
                new EventStore(UUID.randomUUID(), numeroConta, TipoEventoEnum.TRANSFERENCIA_ORIGEM.getValor(), 4, agora,
                        "{\"contaDestino\":\"0950\",\"valor\":\"150.00\"}"),
                new EventStore(UUID.randomUUID(), numeroConta, TipoEventoEnum.TRANSFERENCIA_DESTINO.getValor(), 5, agora,
                        "{\"contaOrigem\":\"0950\",\"valor\":\"300.00\"}"),
                new EventStore(UUID.randomUUID(), numeroConta, TipoEventoEnum.GERENTE_ALTERADO.getValor(), 6, agora,
                        "{\"cpfGerenteAnterior\":\"98574307084\",\"cpfGerenteNovo\":\"64065268052\"}")
        );

        when(eventStoreRepository.findByObjetoIdOrderByVersaoAsc(numeroConta)).thenReturn(eventos);

        Conta conta = contaReplayService.reconstruirConta(numeroConta);

        assertTrue(conta.existe());
        assertEquals(numeroConta, conta.getNumeroConta());
        assertEquals("12912861012", conta.getCpfCliente());
        assertEquals("64065268052", conta.getCpfGerente());
        assertEquals(new BigDecimal("800.00"), conta.getSaldo());
    }
}
