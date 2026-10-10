package com.bantads.msgerente.messaging;

import com.bantads.msgerente.dto.GerenteRequest;
import com.bantads.msgerente.dto.GerenteResponse;
import com.bantads.msgerente.service.GerenteService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.Map;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class GerenteSagaConsumer {
    private static final String FILA = "ms.gerente.cmd";

    private final GerenteService service;
    private final ComandoDedupe dedupe;
    private final RabbitTemplate rabbit;
    private final ObjectMapper mapper;

    public GerenteSagaConsumer(GerenteService service, ComandoDedupe dedupe, RabbitTemplate rabbit, ObjectMapper mapper) {
        this.service = service;
        this.dedupe = dedupe;
        this.rabbit = rabbit;
        this.mapper = mapper;
    }

    @RabbitListener(queues = FILA)
    public void consumir(String mensagem) throws Exception {
        Map<?, ?> comando = mapper.readValue(mensagem, Map.class);
        String sagaId = String.valueOf(comando.get("sagaId"));
        String action = String.valueOf(comando.get("action"));
        if (dedupe.jaProcessado(sagaId, action)) return;

        Map<?, ?> data = comando.get("data") instanceof Map<?, ?> m ? m : Map.of();
        String cpf = String.valueOf(data.get("cpf"));
        Map<String, Object> resposta = new HashMap<>();
        resposta.put("sagaId", sagaId);

        try {
            switch (action) {
                case "CREATE_GERENTE" -> {
                    String telefone = data.get("telefone") == null ? null : String.valueOf(data.get("telefone"));
                    GerenteResponse gerente = service.inserir(new GerenteRequest(cpf, String.valueOf(data.get("nome")), String.valueOf(data.get("email")), telefone));
                    resposta.put("tipo", "GERENTE_CREATED");
                    resposta.put("payload", Map.of("cpf", gerente.cpf(), "nome", gerente.nome(), "email", gerente.email()));
                }
                case "ROLLBACK_GERENTE" -> {
                    service.remover(cpf);
                    resposta.put("tipo", "GERENTE_ROLLBACK_DONE");
                    resposta.put("payload", Map.of("cpf", cpf));
                }
                case "INACTIVATE_GERENTE" -> {
                    service.desativar(cpf);
                    resposta.put("tipo", "GERENTE_INACTIVATED");
                    resposta.put("payload", Map.of("cpf", cpf));
                }
                case "REACTIVATE_GERENTE" -> {
                    service.reativar(cpf);
                    resposta.put("tipo", "GERENTE_REACTIVATED");
                    resposta.put("payload", Map.of("cpf", cpf));
                }
                default -> { return; }
            }
        } catch (ResponseStatusException e) {
            resposta.put("tipo", action.startsWith("INACTIVATE") ? "GERENTE_INACTIVATE_FAILED" : "GERENTE_FAILED");
            resposta.put("payload", Map.of("cpf", cpf));
            resposta.put("erro", e.getReason() != null ? e.getReason() : e.getMessage());
        }

        rabbit.convertAndSend("orquestrador.reply", mapper.writeValueAsString(resposta));
        dedupe.registrar(sagaId, action);
    }

    @Configuration
    static class QueueConfig {
        @Bean DirectExchange bantadsDlx() { return new DirectExchange("bantads.dlx"); }
        @Bean Queue gerenteCmdDlq() { return QueueBuilder.durable(FILA + ".dlq").build(); }
        @Bean Binding gerenteCmdDlqBinding() { return BindingBuilder.bind(gerenteCmdDlq()).to(bantadsDlx()).with(FILA + ".dlq"); }
        @Bean Queue gerenteCmdQueue() {
            return QueueBuilder.durable(FILA)
                .withArgument("x-dead-letter-exchange", "bantads.dlx")
                .withArgument("x-dead-letter-routing-key", FILA + ".dlq")
                .build();
        }
        @Bean Queue orquestradorReplyQueue() { return QueueBuilder.durable("orquestrador.reply").build(); }
    }
}
