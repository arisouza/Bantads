package com.bantads.msconta.service;

import com.bantads.msconta.domain.entity.ContaRead;
import com.bantads.msconta.domain.entity.EventoProcessado;
import com.bantads.msconta.domain.entity.MovimentacaoRead;
import com.bantads.msconta.domain.event.TipoEventoEnum;
import com.bantads.msconta.messaging.ContaEventMessage;
import com.bantads.msconta.repository.query.ContaReadRepository;
import com.bantads.msconta.repository.query.EventoProcessadoRepository;
import com.bantads.msconta.repository.query.MovimentacaoReadRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;

@Service
public class ContaProjectionService {

    private final EventoProcessadoRepository eventoProcessadoRepository;
    private final ContaReadRepository contaReadRepository;
    private final MovimentacaoReadRepository movimentacaoReadRepository;

    public ContaProjectionService(
            EventoProcessadoRepository eventoProcessadoRepository,
            ContaReadRepository contaReadRepository,
            MovimentacaoReadRepository movimentacaoReadRepository
    ) {
        this.eventoProcessadoRepository = eventoProcessadoRepository;
        this.contaReadRepository = contaReadRepository;
        this.movimentacaoReadRepository = movimentacaoReadRepository;
    }

    @Transactional
    public void projetar(ContaEventMessage evento) {
        if (evento.getEventId() == null || eventoProcessadoRepository.existsByEventId(evento.getEventId())) {
            return;
        }

        try {
            eventoProcessadoRepository.saveAndFlush(new EventoProcessado(
                    evento.getEventId(),
                    evento.getObjetoId(),
                    evento.getVersao(),
                    OffsetDateTime.now()
            ));
        } catch (DataIntegrityViolationException e) {
            return;
        }

        TipoEventoEnum tipo = TipoEventoEnum.fromValor(evento.getTipo());
        Map<String, Object> payload = evento.getPayload();

        switch (tipo) {
            case CRIADO -> projetarCriado(evento, payload);
            case DEPOSITO, SAQUE, TRANSFERENCIA_ORIGEM, TRANSFERENCIA_DESTINO -> projetarMovimentacao(evento, tipo, payload);
            case GERENTE_ALTERADO -> projetarGerenteAlterado(evento, payload);
        }
    }

    private void projetarCriado(ContaEventMessage evento, Map<String, Object> payload) {
        ContaRead conta = new ContaRead();
        conta.setNumeroConta(texto(payload, "numeroConta", evento.getObjetoId()));
        conta.setCpfCliente(texto(payload, "cpfCliente", null));
        conta.setCpfGerente(texto(payload, "cpfGerente", null));
        conta.setDataCriacao(evento.getTimestamp());
        conta.setSaldo(BigDecimal.ZERO);
        contaReadRepository.save(conta);
    }

    private void projetarMovimentacao(ContaEventMessage evento, TipoEventoEnum tipo, Map<String, Object> payload) {
        ContaRead conta = contaReadRepository.findById(evento.getObjetoId())
                .orElseThrow(() -> new IllegalStateException("Read model sem conta " + evento.getObjetoId()));

        BigDecimal valor = new BigDecimal(texto(payload, "valor", "0"));
        if (tipo.aumentaSaldo()) {
            conta.setSaldo(conta.getSaldo().add(valor));
        } else {
            conta.setSaldo(conta.getSaldo().subtract(valor));
        }
        contaReadRepository.save(conta);

        MovimentacaoRead movimentacao = new MovimentacaoRead();
        movimentacao.setId(evento.getEventId());
        movimentacao.setNumeroConta(evento.getObjetoId());
        movimentacao.setTimestamp(evento.getTimestamp());
        movimentacao.setTipo(tipo.getValor());
        movimentacao.setValor(valor);
        if (tipo == TipoEventoEnum.TRANSFERENCIA_ORIGEM) {
            movimentacao.setCpfDestino(texto(payload, "cpfDestino", null));
            movimentacao.setNomeDestino(texto(payload, "nomeDestino", null));
        }
        if (tipo == TipoEventoEnum.TRANSFERENCIA_DESTINO) {
            movimentacao.setCpfOrigem(texto(payload, "cpfOrigem", null));
            movimentacao.setNomeOrigem(texto(payload, "nomeOrigem", null));
        }
        movimentacaoReadRepository.save(movimentacao);
    }

    private void projetarGerenteAlterado(ContaEventMessage evento, Map<String, Object> payload) {
        ContaRead conta = contaReadRepository.findById(evento.getObjetoId())
                .orElseThrow(() -> new IllegalStateException("Read model sem conta " + evento.getObjetoId()));
        conta.setCpfGerente(texto(payload, "cpfGerenteNovo", conta.getCpfGerente()));
        contaReadRepository.save(conta);
    }

    private String texto(Map<String, Object> payload, String chave, String padrao) {
        if (payload == null || payload.get(chave) == null) {
            return padrao;
        }
        return String.valueOf(payload.get(chave));
    }
}
