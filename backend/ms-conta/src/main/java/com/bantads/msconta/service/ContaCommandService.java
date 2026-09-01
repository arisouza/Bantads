package com.bantads.msconta.service;

import com.bantads.msconta.domain.entity.Conta;
import com.bantads.msconta.domain.event.TipoEventoEnum;
import com.bantads.msconta.exception.ConflitoVersaoException;
import com.bantads.msconta.exception.ContaNaoEncontradaException;
import com.bantads.msconta.exception.ContaNaoPertenceException;
import com.bantads.msconta.exception.SaldoInsuficienteException;
import com.bantads.msconta.exception.ValorInvalidoException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Supplier;

@Service
public class ContaCommandService {

    private static final int MAX_TENTATIVAS = 3;

    private final ContaReplayService contaReplayService;
    private final ContaEventService contaEventService;

    public ContaCommandService(
            ContaReplayService contaReplayService,
            ContaEventService contaEventService
    ) {
        this.contaReplayService = contaReplayService;
        this.contaEventService = contaEventService;
    }

    public void depositar(String numeroConta, String valorStr, String cpfUsuario) {
        BigDecimal valor = parseValor(valorStr);
        executarComRetry(() -> {
            Conta conta = reconstruirExistente(numeroConta);
            garantirDono(conta, cpfUsuario);
            contaEventService.registrarEvento(numeroConta, TipoEventoEnum.DEPOSITO, payloadValor(valor));
            return null;
        });
    }

    public void sacar(String numeroConta, String valorStr, String cpfUsuario) {
        BigDecimal valor = parseValor(valorStr);
        executarComRetry(() -> {
            Conta conta = reconstruirExistente(numeroConta);
            garantirDono(conta, cpfUsuario);
            garantirSaldo(conta, valor);
            contaEventService.registrarEvento(numeroConta, TipoEventoEnum.SAQUE, payloadValor(valor));
            return null;
        });
    }

    @Transactional
    public void transferir(
            String contaOrigem,
            String contaDestino,
            String valorStr,
            String cpfUsuario,
            String cpfOrigem,
            String nomeOrigem,
            String cpfDestino,
            String nomeDestino
    ) {
        BigDecimal valor = parseValor(valorStr);
        if (contaOrigem.equals(contaDestino)) {
            throw new ValorInvalidoException("A conta destino deve ser diferente da origem");
        }
        executarComRetry(() -> {
            Conta origem = reconstruirExistente(contaOrigem);
            Conta destino = reconstruirExistente(contaDestino);
            garantirDono(origem, cpfUsuario);
            garantirSaldo(origem, valor);

            Map<String, String> payloadOrigem = new LinkedHashMap<>();
            payloadOrigem.put("contaDestino", contaDestino);
            payloadOrigem.put("cpfDestino", cpfDestino);
            payloadOrigem.put("nomeDestino", nomeDestino);
            payloadOrigem.put("valor", valor.toPlainString());

            Map<String, String> payloadDestino = new LinkedHashMap<>();
            payloadDestino.put("contaOrigem", contaOrigem);
            payloadDestino.put("cpfOrigem", firstNonBlank(cpfOrigem, origem.getCpfCliente()));
            payloadDestino.put("nomeOrigem", nomeOrigem);
            payloadDestino.put("valor", valor.toPlainString());

            contaEventService.registrarEvento(contaOrigem, TipoEventoEnum.TRANSFERENCIA_ORIGEM, payloadOrigem);
            contaEventService.registrarEvento(contaDestino, TipoEventoEnum.TRANSFERENCIA_DESTINO, payloadDestino);
            return null;
        });
    }

    private Conta reconstruirExistente(String numeroConta) {
        Conta conta = contaReplayService.reconstruirConta(numeroConta);
        if (!conta.existe()) {
            throw new ContaNaoEncontradaException(numeroConta);
        }
        return conta;
    }

    private void garantirDono(Conta conta, String cpfUsuario) {
        if (cpfUsuario == null || cpfUsuario.isBlank() || !cpfUsuario.equals(conta.getCpfCliente())) {
            throw new ContaNaoPertenceException();
        }
    }

    private void garantirSaldo(Conta conta, BigDecimal valor) {
        if (conta.getSaldo().compareTo(valor) < 0) {
            throw new SaldoInsuficienteException();
        }
    }

    private Map<String, String> payloadValor(BigDecimal valor) {
        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("valor", valor.toPlainString());
        return payload;
    }

    private BigDecimal parseValor(String valorStr) {
        if (valorStr == null || valorStr.isBlank()) {
            throw new ValorInvalidoException("Valor é obrigatório");
        }
        try {
            BigDecimal valor = new BigDecimal(valorStr);
            if (valor.compareTo(BigDecimal.ZERO) <= 0) {
                throw new ValorInvalidoException("Valor deve ser maior que zero");
            }
            if (valor.scale() > 4) {
                throw new ValorInvalidoException("Valor não pode ter mais de 4 casas decimais");
            }
            return valor;
        } catch (NumberFormatException e) {
            throw new ValorInvalidoException("Valor monetário inválido");
        }
    }

    private String firstNonBlank(String preferido, String fallback) {
        if (preferido != null && !preferido.isBlank()) {
            return preferido;
        }
        return fallback;
    }

    private <T> T executarComRetry(Supplier<T> acao) {
        int tentativas = 0;
        while (true) {
            try {
                return acao.get();
            } catch (DataIntegrityViolationException e) {
                tentativas++;
                if (tentativas >= MAX_TENTATIVAS) {
                    throw new ConflitoVersaoException();
                }
            }
        }
    }
}
