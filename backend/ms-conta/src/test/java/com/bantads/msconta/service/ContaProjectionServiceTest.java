package com.bantads.msconta.service;

import com.bantads.msconta.domain.entity.ContaRead;
import com.bantads.msconta.domain.entity.EventoProcessado;
import com.bantads.msconta.domain.entity.MovimentacaoRead;
import com.bantads.msconta.domain.event.TipoEventoEnum;
import com.bantads.msconta.messaging.ContaEventMessage;
import com.bantads.msconta.repository.query.ContaReadRepository;
import com.bantads.msconta.repository.query.EventoProcessadoRepository;
import com.bantads.msconta.repository.query.MovimentacaoReadRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContaProjectionServiceTest {

    @Mock private EventoProcessadoRepository eventoProcessadoRepository;
    @Mock private ContaReadRepository contaReadRepository;
    @Mock private MovimentacaoReadRepository movimentacaoReadRepository;

    private ContaProjectionService service;

    @BeforeEach
    void setUp() {
        service = new ContaProjectionService(eventoProcessadoRepository, contaReadRepository, movimentacaoReadRepository);
    }

    @Test
    void deveIgnorarEventoJaProcessadoDeFormaIdempotente() {
        UUID eventId = UUID.randomUUID();
        ContaEventMessage msg = new ContaEventMessage();
        msg.setEventId(eventId);
        msg.setObjetoId("1291");
        msg.setTipo(TipoEventoEnum.DEPOSITO.getValor());
        msg.setVersao(2);

        when(eventoProcessadoRepository.existsByEventId(eventId)).thenReturn(true);

        service.projetar(msg);

        verify(eventoProcessadoRepository, never()).saveAndFlush(any(EventoProcessado.class));
        verify(contaReadRepository, never()).save(any(ContaRead.class));
    }

    @Test
    void deveProjetarTransferenciaOrigemAtualizandoSaldoEMovimentacao() {
        UUID eventId = UUID.randomUUID();
        ContaRead conta = new ContaRead();
        conta.setNumeroConta("1291");
        conta.setCpfCliente("12912861012");
        conta.setCpfGerente("98574307084");
        conta.setSaldo(new BigDecimal("1000.00"));

        ContaEventMessage msg = new ContaEventMessage();
        msg.setEventId(eventId);
        msg.setObjetoId("1291");
        msg.setTipo(TipoEventoEnum.TRANSFERENCIA_ORIGEM.getValor());
        msg.setVersao(3);
        msg.setTimestamp(OffsetDateTime.now());
        msg.setPayload(Map.of(
                "contaDestino", "0950",
                "cpfDestino", "09506382000",
                "nomeDestino", "Cleuddônio",
                "valor", "250.00"
        ));

        when(eventoProcessadoRepository.existsByEventId(eventId)).thenReturn(false);
        when(contaReadRepository.findById("1291")).thenReturn(Optional.of(conta));

        service.projetar(msg);

        assertEquals(new BigDecimal("750.00"), conta.getSaldo());
        verify(contaReadRepository).save(conta);

        ArgumentCaptor<MovimentacaoRead> captor = ArgumentCaptor.forClass(MovimentacaoRead.class);
        verify(movimentacaoReadRepository).save(captor.capture());
        MovimentacaoRead mov = captor.getValue();
        assertEquals("09506382000", mov.getCpfDestino());
        assertEquals("Cleuddônio", mov.getNomeDestino());
        assertEquals(new BigDecimal("250.00"), mov.getValor());
    }
}

