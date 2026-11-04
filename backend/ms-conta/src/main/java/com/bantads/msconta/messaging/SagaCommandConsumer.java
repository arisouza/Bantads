package com.bantads.msconta.messaging;

import com.bantads.msconta.domain.entity.Conta;
import com.bantads.msconta.domain.entity.SagaCommandExecution;
import com.bantads.msconta.dto.ContaMenorSaldoResponse;
import com.bantads.msconta.dto.GerenteMenosClientesResponse;
import com.bantads.msconta.service.ContaCommandService;
import com.bantads.msconta.service.ContaQueryService;
import com.bantads.msconta.service.SagaCommandExecutionService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class SagaCommandConsumer {

    private final ContaCommandService contaCommandService;
    private final ContaQueryService contaQueryService;
    private final SagaCommandExecutionService sagaCommandExecutionService;
    private final SagaReplyPublisher sagaReplyPublisher;
    private final ObjectMapper objectMapper;

    public SagaCommandConsumer(
            ContaCommandService contaCommandService,
            ContaQueryService contaQueryService,
            SagaCommandExecutionService sagaCommandExecutionService,
            SagaReplyPublisher sagaReplyPublisher,
            ObjectMapper objectMapper
    ) {
        this.contaCommandService = contaCommandService;
        this.contaQueryService = contaQueryService;
        this.sagaCommandExecutionService = sagaCommandExecutionService;
        this.sagaReplyPublisher = sagaReplyPublisher;
        this.objectMapper = objectMapper;
    }

    @RabbitListener(queues = "${bantads.rabbitmq.queues.conta-cmd}")
    public void consumir(SagaCommandMessage command) {

        Optional<SagaCommandExecution> executionOptional =
                sagaCommandExecutionService.iniciar(
                        command.getSagaId(),
                        command.getTipo()
                );

        if (executionOptional.isEmpty()) {
            return;
        }

        SagaCommandExecution execution = executionOptional.get();

        try {
            switch (command.getTipo()) {
                case "CREATE_CONTA" -> processarCriarConta(
                        command,
                        execution
                );
                case "ALTERAR_GERENTE" -> processarAlterarGerente(
                        command,
                        execution
                );
                case "TRANSFERIR_CONTAS_GERENTE" -> processarTransferirContasGerente(command, execution);
                case "REASSOCIAR_CONTAS" -> processarReassociarContas(command, execution);
                case "IDENTIFICAR_GERENTE_MENOS_CLIENTES" -> processarIdentificarGerenteMenosClientes(command, execution);
                case "IDENTIFICAR_CONTA_MENOR_SALDO" -> processarIdentificarContaMenorSaldo(command, execution);
                case "DELETE_CONTA", "REMOVER_CONTA" -> processarRemoverConta(
                        command,
                        execution
                );

                default -> throw new IllegalArgumentException(
                        "Tipo de comando da Saga não suportado: "
                                + command.getTipo()
                );
            }

        } catch (Exception exception) {
            processarFalha(
                    execution,
                    command,
                    exception
            );
        }
    }

    private void processarCriarConta(
            SagaCommandMessage command,
            SagaCommandExecution execution
    ) throws JsonProcessingException {

        Map<String, Object> payload = command.getPayload();

        String cpfCliente = getString(
                payload,
                "cpfCliente"
        );

        List<String> cpfsGerentesAtivos = getStringList(
                payload,
                "cpfsGerentesAtivos"
        );

        Conta conta = contaCommandService.criarConta(
                cpfCliente,
                cpfsGerentesAtivos
        );

        Map<String, Object> responsePayload = Map.of(
                "numeroConta", conta.getNumeroConta(),
                "cpfCliente", conta.getCpfCliente(),
                "cpfGerente", conta.getCpfGerente()
        );

        String responseJson =
                objectMapper.writeValueAsString(responsePayload);

        sagaCommandExecutionService.concluir(
                execution,
                responseJson
        );

        SagaReplyMessage reply = new SagaReplyMessage();

        reply.setSagaId(command.getSagaId());
        reply.setTipo("CONTA_CREATED");
        reply.setPayload(responsePayload);
        reply.setTimestamp(command.getTimestamp());
        reply.setStatus("CONCLUIDO");
        reply.setErro(null);

        sagaReplyPublisher.publicar(reply);
    }

    private void processarAlterarGerente(
            SagaCommandMessage command,
            SagaCommandExecution execution
    ) throws JsonProcessingException {

        Map<String, Object> payload = command.getPayload();

        String numeroConta = getString(payload, "numeroConta");
        String cpfGerenteNovo = getString(payload, "cpfGerenteNovo");

        Conta conta = contaCommandService.alterarGerente(
                numeroConta,
                cpfGerenteNovo
        );

        Map<String, Object> responsePayload = Map.of(
                "numeroConta", conta.getNumeroConta(),
                "cpfCliente", conta.getCpfCliente(),
                "cpfGerente", conta.getCpfGerente()
        );

        String responseJson = objectMapper.writeValueAsString(responsePayload);

        sagaCommandExecutionService.concluir(execution, responseJson);

        SagaReplyMessage reply = new SagaReplyMessage();
        reply.setSagaId(command.getSagaId());
        reply.setTipo("GERENTE_ALTERADO");
        reply.setPayload(responsePayload);
        reply.setTimestamp(command.getTimestamp());
        reply.setStatus("CONCLUIDO");
        reply.setErro(null);

        sagaReplyPublisher.publicar(reply);
    }

    private void processarRemoverConta(
            SagaCommandMessage command,
            SagaCommandExecution execution
    ) throws JsonProcessingException {

        Map<String, Object> payload = command.getPayload();
        Conta conta;

        if ("DELETE_CONTA".equals(command.getTipo())) {
            String numeroConta = getString(payload, "numeroConta");
            String cpfCliente = getString(payload, "cpfCliente");
            conta = contaCommandService.removerConta(numeroConta, cpfCliente);
        } else if (payload.get("numeroConta") != null && !payload.get("numeroConta").toString().isBlank()) {
            conta = contaCommandService.removerConta(payload.get("numeroConta").toString());
        } else {
            String cpfCliente = getString(payload, "cpfCliente");
            conta = contaCommandService.removerContaPorCpf(cpfCliente);
        }

        Map<String, Object> responsePayload = Map.of(
                "numeroConta", conta.getNumeroConta(),
                "cpfCliente", conta.getCpfCliente(),
                "cpfGerente", conta.getCpfGerente()
        );

        String responseJson = objectMapper.writeValueAsString(responsePayload);
        sagaCommandExecutionService.concluir(execution, responseJson);

        SagaReplyMessage reply = new SagaReplyMessage();
        reply.setSagaId(command.getSagaId());
        reply.setTipo("CONTA_REMOVIDA");
        reply.setPayload(responsePayload);
        reply.setTimestamp(command.getTimestamp());
        reply.setStatus("CONCLUIDO");
        reply.setErro(null);

        sagaReplyPublisher.publicar(reply);
    }

    private void processarTransferirContasGerente(
            SagaCommandMessage command,
            SagaCommandExecution execution
    ) throws JsonProcessingException {
        Map<String, Object> payload = command.getPayload();
        String cpfGerenteRemovido = getString(payload, "cpfGerenteRemovido");
        List<String> cpfsGerentesAtivos = getStringList(payload, "cpfsGerentesAtivos");

        var resultado = contaCommandService.transferirContasDoGerente(
                cpfGerenteRemovido,
                cpfsGerentesAtivos
        );

        Map<String, Object> responsePayload = new HashMap<>();
        responsePayload.put("cpfGerenteRemovido", resultado.getCpfGerenteRemovido());
        responsePayload.put("quantidadeContas", resultado.getQuantidadeContas());
        responsePayload.put("cpfsClientes", resultado.getCpfsClientes());
        responsePayload.put("numerosContas", resultado.getNumerosContas());
        responsePayload.put("contaParaGerente", resultado.getContaParaGerente());

        sagaCommandExecutionService.concluir(
                execution,
                objectMapper.writeValueAsString(responsePayload)
        );

        SagaReplyMessage reply = new SagaReplyMessage();
        reply.setSagaId(command.getSagaId());
        reply.setTipo("CONTAS_GERENTE_TRANSFERIDAS");
        reply.setPayload(responsePayload);
        reply.setTimestamp(command.getTimestamp());
        reply.setStatus("CONCLUIDO");
        reply.setErro(null);
        sagaReplyPublisher.publicar(reply);
    }

    private void processarIdentificarGerenteMenosClientes(
            SagaCommandMessage command,
            SagaCommandExecution execution
    ) throws JsonProcessingException {
        List<String> cpfsGerentesAtivos = getStringList(command.getPayload(), "cpfsGerentesAtivos");
        GerenteMenosClientesResponse resultado =
                contaQueryService.escolherGerenteComMenosClientes(cpfsGerentesAtivos);

        Map<String, Object> responsePayload = new HashMap<>();
        responsePayload.put("cpfGerente", resultado.getCpfGerente());
        responsePayload.put("quantidadeClientes", resultado.getQuantidadeClientes());

        sagaCommandExecutionService.concluir(execution, objectMapper.writeValueAsString(responsePayload));

        SagaReplyMessage reply = new SagaReplyMessage();
        reply.setSagaId(command.getSagaId());
        reply.setTipo("GERENTE_MENOS_CLIENTES_IDENTIFICADO");
        reply.setPayload(responsePayload);
        reply.setTimestamp(command.getTimestamp());
        reply.setStatus("CONCLUIDO");
        reply.setErro(null);
        sagaReplyPublisher.publicar(reply);
    }

    private void processarIdentificarContaMenorSaldo(
            SagaCommandMessage command,
            SagaCommandExecution execution
    ) throws JsonProcessingException {
        String cpfGerente = getString(command.getPayload(), "cpfGerente");
        ContaMenorSaldoResponse resultado =
                contaQueryService.buscarContaMenorSaldoDoGerente(cpfGerente);

        Map<String, Object> responsePayload = new HashMap<>();
        responsePayload.put("cpfGerente", resultado.getCpfGerente());
        responsePayload.put("semConta", resultado.isSemConta());
        if (resultado.getConta() != null) {
            responsePayload.put("numeroConta", resultado.getConta().getNumeroConta());
            responsePayload.put("cpfCliente", resultado.getConta().getCpfCliente());
            responsePayload.put("saldo", resultado.getConta().getSaldo());
        }

        sagaCommandExecutionService.concluir(execution, objectMapper.writeValueAsString(responsePayload));

        SagaReplyMessage reply = new SagaReplyMessage();
        reply.setSagaId(command.getSagaId());
        reply.setTipo("CONTA_MENOR_SALDO_IDENTIFICADA");
        reply.setPayload(responsePayload);
        reply.setTimestamp(command.getTimestamp());
        reply.setStatus("CONCLUIDO");
        reply.setErro(null);
        sagaReplyPublisher.publicar(reply);
    }

    private void processarReassociarContas(SagaCommandMessage command, SagaCommandExecution execution) throws JsonProcessingException {
        Map<String, Object> payload = command.getPayload();
        String cpfGerenteDestino = getString(payload, "cpfGerenteDestino");
        List<String> numerosConta = getStringList(payload, "numerosConta");
        contaCommandService.reassociarContas(cpfGerenteDestino, numerosConta);

        int totalContas = numerosConta != null ? numerosConta.size() : 0;
        Map<String, Object> responsePayload = Map.of("cpfGerenteDestino", cpfGerenteDestino, "quantidadeContas", totalContas);
        sagaCommandExecutionService.concluir(execution, objectMapper.writeValueAsString(responsePayload));
        SagaReplyMessage reply = new SagaReplyMessage();
        reply.setSagaId(command.getSagaId());
        reply.setTipo("CONTAS_REASSOCIADAS");
        reply.setPayload(responsePayload);
        reply.setTimestamp(command.getTimestamp());
        reply.setStatus("CONCLUIDO");
        sagaReplyPublisher.publicar(reply);
    }

    private void processarFalha(
            SagaCommandExecution execution,
            SagaCommandMessage command,
            Exception exception
    ) {

        String erro = exception.getMessage();

        Map<String, Object> responsePayload = new HashMap<>(command.getPayload());
        responsePayload.put("comandoTipo", command.getTipo());

        try {
            String responseJson =
                    objectMapper.writeValueAsString(
                            responsePayload
                    );

            sagaCommandExecutionService.falhar(
                    execution,
                    responseJson,
                    erro
            );

            SagaReplyMessage reply = new SagaReplyMessage();

            reply.setSagaId(command.getSagaId());
            reply.setTipo("CONTA_FAILED");
            reply.setPayload(responsePayload);
            reply.setTimestamp(command.getTimestamp());
            reply.setStatus("FALHA");
            reply.setErro(erro);

            sagaReplyPublisher.publicar(reply);

        } catch (JsonProcessingException jsonException) {
            throw new IllegalStateException(
                    "Erro ao serializar resposta de falha da Saga",
                    jsonException
            );
        }
    }

    private String getString(
            Map<String, Object> payload,
            String key
    ) {

        Object value = payload.get(key);

        if (value == null || value.toString().isBlank()) {
            throw new IllegalArgumentException(
                    "Campo obrigatório ausente no payload: " + key
            );
        }

        return value.toString();
    }

    private List<String> getStringList(
            Map<String, Object> payload,
            String key
    ) {

        Object value = payload.get(key);

        if (value == null) {
            return List.of();
        }

        if (!(value instanceof List<?> list)) {
            throw new IllegalArgumentException(
                    "Campo deve ser uma lista: " + key
            );
        }

        return list.stream()
                .map(Object::toString)
                .toList();
    }
}
