package com.bantads.msconta.service;

import com.bantads.msconta.domain.entity.ContaRead;
import com.bantads.msconta.domain.entity.MovimentacaoRead;
import com.bantads.msconta.domain.event.TipoEventoEnum;
import com.bantads.msconta.dto.ContaResponse;
import com.bantads.msconta.dto.ExtratoResponse;
import com.bantads.msconta.dto.MovimentacaoResponse;
import com.bantads.msconta.exception.ContaNaoEncontradaException;
import com.bantads.msconta.exception.ValorInvalidoException;
import com.bantads.msconta.repository.query.ContaReadRepository;
import com.bantads.msconta.repository.query.MovimentacaoReadRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

@Service
public class ContaQueryService {

    private static final int INTERVALO_MAXIMO_DIAS = 365;

    private final ContaReadRepository contaReadRepository;
    private final MovimentacaoReadRepository movimentacaoReadRepository;

    public ContaQueryService(
            ContaReadRepository contaReadRepository,
            MovimentacaoReadRepository movimentacaoReadRepository
    ) {
        this.contaReadRepository = contaReadRepository;
        this.movimentacaoReadRepository = movimentacaoReadRepository;
    }

    public ContaResponse buscarPorNumero(String numeroConta) {
        ContaRead conta = contaReadRepository.findById(numeroConta)
                .orElseThrow(() -> new ContaNaoEncontradaException(numeroConta));
        return toContaResponse(conta);
    }

    public ContaResponse buscarPorCpf(String cpfCliente) {
        ContaRead conta = contaReadRepository.findByCpfCliente(cpfCliente)
                .orElseThrow(() -> new ContaNaoEncontradaException(cpfCliente));
        return toContaResponse(conta);
    }

    public ExtratoResponse buscarExtrato(String numeroConta, String inicioRaw, String fimRaw) {
        if (!contaReadRepository.existsById(numeroConta)) {
            throw new ContaNaoEncontradaException(numeroConta);
        }

        OffsetDateTime inicio = parseInicio(inicioRaw);
        OffsetDateTime fim = parseFim(fimRaw);
        if (fim.isBefore(inicio)) {
            throw new ValorInvalidoException("A data final deve ser posterior à data inicial");
        }
        if (Duration.between(inicio, fim).toDays() > INTERVALO_MAXIMO_DIAS) {
            throw new ValorInvalidoException("O intervalo máximo do extrato é de 365 dias");
        }

        List<MovimentacaoRead> anteriores = movimentacaoReadRepository
                .findByNumeroContaAndTimestampLessThanOrderByTimestampAsc(numeroConta, inicio);
        BigDecimal saldoAbertura = BigDecimal.ZERO;
        for (MovimentacaoRead movimentacao : anteriores) {
            saldoAbertura = aplicarSinal(saldoAbertura, movimentacao.getTipo(), movimentacao.getValor());
        }

        List<MovimentacaoRead> periodo = movimentacaoReadRepository
                .findByNumeroContaAndTimestampGreaterThanEqualAndTimestampLessThanEqualOrderByTimestampAsc(
                        numeroConta,
                        inicio,
                        fim
                );

        List<MovimentacaoResponse> itens = new ArrayList<>();
        for (MovimentacaoRead movimentacao : periodo) {
            itens.add(toMovimentacaoResponse(movimentacao));
        }

        ExtratoResponse response = new ExtratoResponse();
        response.setNumeroConta(numeroConta);
        response.setInicio(inicio);
        response.setFim(fim);
        response.setSaldoAbertura(saldoAbertura.toPlainString());
        response.setMovimentacoes(itens);
        return response;
    }

    public long contarContas() {
        return contaReadRepository.count();
    }

    private ContaResponse toContaResponse(ContaRead conta) {
        ContaResponse response = new ContaResponse();
        response.setNumeroConta(conta.getNumeroConta());
        response.setCpfCliente(conta.getCpfCliente());
        response.setDataCriacao(conta.getDataCriacao());
        response.setSaldo(conta.getSaldo().toPlainString());
        response.setCpfGerente(conta.getCpfGerente());
        return response;
    }

    private MovimentacaoResponse toMovimentacaoResponse(MovimentacaoRead movimentacao) {
        MovimentacaoResponse response = new MovimentacaoResponse();
        response.setId(movimentacao.getId());
        response.setNumeroConta(movimentacao.getNumeroConta());
        response.setTimestamp(movimentacao.getTimestamp());
        response.setTipo(movimentacao.getTipo());
        response.setCpfOrigem(movimentacao.getCpfOrigem());
        response.setNomeOrigem(movimentacao.getNomeOrigem());
        response.setCpfDestino(movimentacao.getCpfDestino());
        response.setNomeDestino(movimentacao.getNomeDestino());
        response.setValor(movimentacao.getValor().toPlainString());
        return response;
    }

    private BigDecimal aplicarSinal(BigDecimal saldo, String tipo, BigDecimal valor) {
        TipoEventoEnum tipoEvento = TipoEventoEnum.fromValor(tipo);
        if (tipoEvento.aumentaSaldo()) {
            return saldo.add(valor);
        }
        return saldo.subtract(valor);
    }

    private OffsetDateTime parseInicio(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ValorInvalidoException("Data de início é obrigatória");
        }
        if (raw.length() == 10) {
            return LocalDate.parse(raw).atStartOfDay().atOffset(ZoneOffset.UTC);
        }
        return OffsetDateTime.parse(raw);
    }

    private OffsetDateTime parseFim(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ValorInvalidoException("Data de fim é obrigatória");
        }
        if (raw.length() == 10) {
            return LocalDate.parse(raw).plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC).minusNanos(1);
        }
        return OffsetDateTime.parse(raw);
    }
}
