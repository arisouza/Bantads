package com.bantads.mscliente.messaging;

import com.bantads.mscliente.dto.SolicitacaoResponse;
import com.bantads.mscliente.service.ClienteService;
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
public class ClienteSagaConsumer {
    private static final String FILA = "ms.cliente.cmd";

    private final ClienteService service;
    private final ComandoDedupe dedupe;
    private final RabbitTemplate rabbit;
    private final ObjectMapper mapper;

    public ClienteSagaConsumer(ClienteService service, ComandoDedupe dedupe, RabbitTemplate rabbit, ObjectMapper mapper) {
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
            if ("CREATE_CLIENTE".equals(action)) {
                SolicitacaoResponse solicitacao = service.criarClienteDaSolicitacao(cpf);
                Map<String, Object> payload = new HashMap<>();
                payload.put("cpf", solicitacao.cpf());
                payload.put("cpfCliente", solicitacao.cpf());
                payload.put("email", solicitacao.email());
                payload.put("nome", solicitacao.nome());
                resposta.put("tipo", "CLIENTE_CREATED");
                resposta.put("payload", payload);
            } else if ("ROLLBACK_CLIENTE".equals(action)) {
                Object motivo = data.get("motivo");
                service.rollbackCliente(cpf, motivo == null ? null : String.valueOf(motivo));
                resposta.put("tipo", "CLIENTE_ROLLBACK_DONE");
                resposta.put("payload", Map.of("cpf", cpf));
            } else return;
        } catch (ResponseStatusException e) {
            resposta.put("tipo", "CLIENTE_FAILED");
            resposta.put("payload", Map.of("cpf", cpf));
            resposta.put("erro", e.getReason() != null ? e.getReason() : e.getMessage());
        }

        rabbit.convertAndSend("orquestrador.reply", mapper.writeValueAsString(resposta));
        dedupe.registrar(sagaId, action);
    }

    @Configuration
    static class QueueConfig {
        @Bean DirectExchange bantadsDlx() { return new DirectExchange("bantads.dlx"); }
        @Bean Queue clienteCmdDlq() { return QueueBuilder.durable(FILA + ".dlq").build(); }
        @Bean Binding clienteCmdDlqBinding() { return BindingBuilder.bind(clienteCmdDlq()).to(bantadsDlx()).with(FILA + ".dlq"); }
        @Bean Queue clienteCmdQueue() {
            return QueueBuilder.durable(FILA)
                .withArgument("x-dead-letter-exchange", "bantads.dlx")
                .withArgument("x-dead-letter-routing-key", FILA + ".dlq")
                .build();
        }
    }
}
