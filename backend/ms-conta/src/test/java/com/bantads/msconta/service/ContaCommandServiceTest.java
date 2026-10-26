package com.bantads.msconta.service;

import com.bantads.msconta.domain.entity.Conta;
import com.bantads.msconta.exception.ContaNaoPertenceException;
import com.bantads.msconta.repository.event.EventStoreRepository;
import com.bantads.msconta.repository.query.ContaReadRepository;
import com.bantads.msconta.repository.query.EventoProcessadoRepository;
import com.bantads.msconta.repository.query.MovimentacaoReadRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContaCommandServiceTest {

    @Mock private ContaReplayService contaReplayService;
    @Mock private ContaEventService contaEventService;
    @Mock private EventStoreRepository eventStoreRepository;
    @Mock private ContaReadRepository contaReadRepository;
    @Mock private MovimentacaoReadRepository movimentacaoReadRepository;
    @Mock private EventoProcessadoRepository eventoProcessadoRepository;

    private ContaCommandService service;

    @BeforeEach
    void setUp() {
        service = new ContaCommandService(
                contaReplayService,
                contaEventService,
                eventStoreRepository,
                contaReadRepository,
                movimentacaoReadRepository,
                eventoProcessadoRepository
        );
    }

    @Test
    void naoRemoveContaQuandoCpfNaoPertenceAoNumeroInformado() {
        Conta conta = new Conta();
        conta.setNumeroConta("1234");
        conta.setCpfCliente("11111111111");
        when(contaReplayService.reconstruirConta("1234")).thenReturn(conta);

        assertThrows(
                ContaNaoPertenceException.class,
                () -> service.removerConta("1234", "22222222222")
        );

        verify(movimentacaoReadRepository, never()).deleteByNumeroConta("1234");
        verify(eventoProcessadoRepository, never()).deleteByObjetoId("1234");
        verify(contaReadRepository, never()).deleteById("1234");
        verify(eventStoreRepository, never()).deleteByObjetoId("1234");
    }
}
