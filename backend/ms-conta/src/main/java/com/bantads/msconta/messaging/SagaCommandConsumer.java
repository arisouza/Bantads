package com.bantads.msconta.messaging;

import com.bantads.msconta.domain.entity.Conta;
import com.bantads.msconta.domain.entity.SagaCommandExecution;
import com.bantads.msconta.service.ContaCommandService;
import com.bantads.msconta.service.SagaCommandExecutionService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class SagaCommandConsumer {

    private final ContaCommandService contaCommandService;
    private final SagaCommandExecutionService sagaCommandExecutionService;
    private final SagaReplyPublisher sagaReplyPublisher;
    private final ObjectMapper objectMapper;

    public SagaCommandConsumer(
            ContaCommandService contaCommandService,
            SagaCommandExecutionService sagaCommandExecutionService,
            SagaReplyPublisher sagaReplyPublisher,
            ObjectMapper objectMapper
    ) {
        this.contaCommandService = contaCommandService;
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

    private void processarFalha(
            SagaCommandExecution execution,
            SagaCommandMessage command,
            Exception exception
    ) {

        String erro = exception.getMessage();

        Map<String, Object> responsePayload = Map.of(
                "tipo", command.getTipo()
        );

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