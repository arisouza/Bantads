package com.bantads.msconta.service;

import com.bantads.msconta.domain.entity.Conta;
import com.bantads.msconta.domain.entity.ContaRead;
import com.bantads.msconta.domain.event.TipoEventoEnum;
import com.bantads.msconta.exception.ConflitoVersaoException;
import com.bantads.msconta.exception.ContaJaExistenteException;
import com.bantads.msconta.exception.ContaNaoEncontradaException;
import com.bantads.msconta.exception.ContaNaoPertenceException;
import com.bantads.msconta.exception.SaldoInsuficienteException;
import com.bantads.msconta.exception.ValorInvalidoException;
import com.bantads.msconta.repository.event.EventStoreRepository;
import com.bantads.msconta.repository.query.ContaReadRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Supplier;

@Service
public class ContaCommandService {

    private static final int MAX_TENTATIVAS = 3;
    private static final int MAX_SORTEIOS = 50;

    private final ContaReplayService contaReplayService;
    private final ContaEventService contaEventService;
    private final EventStoreRepository eventStoreRepository;
    private final ContaReadRepository contaReadRepository;

    public ContaCommandService(
            ContaReplayService contaReplayService,
            ContaEventService contaEventService,
            EventStoreRepository eventStoreRepository,
            ContaReadRepository contaReadRepository
    ) {
        this.contaReplayService = contaReplayService;
        this.contaEventService = contaEventService;
        this.eventStoreRepository = eventStoreRepository;
        this.contaReadRepository = contaReadRepository;
    }

    public Conta criarConta(String cpfCliente, List<String> cpfsGerentesAtivos) {
        if (cpfCliente == null || cpfCliente.isBlank()) {
            throw new ValorInvalidoException("CPF do cliente é obrigatório");
        }
        if (contaReadRepository.existsByCpfCliente(cpfCliente)) {
            throw new ContaJaExistenteException(cpfCliente);
        }

        String cpfGerente = escolherGerenteComMenosContas(cpfsGerentesAtivos);
        String numeroConta = sortearNumeroLivre();
        OffsetDateTime dataCriacao = OffsetDateTime.now();

        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("numeroConta", numeroConta);
        payload.put("cpfCliente", cpfCliente);
        payload.put("cpfGerente", cpfGerente);
        payload.put("dataCriacao", dataCriacao.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));

        contaEventService.registrarEvento(numeroConta, TipoEventoEnum.CRIADO, payload);
        return contaReplayService.reconstruirConta(numeroConta);
    }

    public Conta alterarGerente(String numeroConta, String cpfGerenteNovo) {
        if (cpfGerenteNovo == null || cpfGerenteNovo.isBlank()) {
            throw new ValorInvalidoException("CPF do novo gerente é obrigatório");
        }

        Conta conta = reconstruirExistente(numeroConta);
        if (cpfGerenteNovo.equals(conta.getCpfGerente())) {
            throw new ValorInvalidoException("O novo gerente deve ser diferente do atual");
        }

        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("cpfGerenteAnterior", conta.getCpfGerente());
        payload.put("cpfGerenteNovo", cpfGerenteNovo);

        contaEventService.registrarEvento(numeroConta, TipoEventoEnum.GERENTE_ALTERADO, payload);
        return contaReplayService.reconstruirConta(numeroConta);
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

    private String escolherGerenteComMenosContas(List<String> cpfsGerentesAtivos) {
        List<String> candidatos = new ArrayList<>();
        if (cpfsGerentesAtivos != null) {
            for (String cpf : cpfsGerentesAtivos) {
                if (cpf != null && !cpf.isBlank()) {
                    candidatos.add(cpf);
                }
            }
        }
        if (candidatos.isEmpty()) {
            for (ContaRead conta : contaReadRepository.findAll()) {
                if (!candidatos.contains(conta.getCpfGerente())) {
                    candidatos.add(conta.getCpfGerente());
                }
            }
        }
        if (candidatos.isEmpty()) {
            throw new ValorInvalidoException("Não há gerentes disponíveis para vincular a conta");
        }

        String escolhido = candidatos.get(0);
        long menorQuantidade = Long.MAX_VALUE;
        for (String cpfGerente : candidatos) {
            long quantidade = contaReadRepository.countByCpfGerente(cpfGerente);
            if (quantidade < menorQuantidade) {
                menorQuantidade = quantidade;
                escolhido = cpfGerente;
            }
        }
        return escolhido;
    }

    private String sortearNumeroLivre() {
        for (int i = 0; i < MAX_SORTEIOS; i++) {
            String numero = String.format("%04d", ThreadLocalRandom.current().nextInt(10000));
            if (!eventStoreRepository.existsByObjetoId(numero) && !contaReadRepository.existsById(numero)) {
                return numero;
            }
        }
        throw new IllegalStateException("Não foi possível sortear um número de conta livre");
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
