package com.bantads.msgerente.messaging;

import com.bantads.msgerente.dto.GerenteRequest;
import com.bantads.msgerente.dto.GerenteResponse;
import com.bantads.msgerente.service.GerenteService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.Map;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

@Component
public class GerenteSagaConsumer {
    private final GerenteService service;
    private final RabbitTemplate rabbit;
    private final ObjectMapper mapper;

    public GerenteSagaConsumer(GerenteService service, RabbitTemplate rabbit, ObjectMapper mapper) {
        this.service = service;
        this.rabbit = rabbit;
        this.mapper = mapper;
    }

    @RabbitListener(queues = "gerente.cmd")
    public void consumir(String mensagem) {
        try {
            Map<?, ?> comando = mapper.readValue(mensagem, Map.class);
            String sagaId = String.valueOf(comando.get("sagaId"));
            String action = String.valueOf(comando.get("action"));
            Map<?, ?> data = comando.get("data") instanceof Map<?, ?> m ? m : Map.of();

            Map<String, Object> resposta = new HashMap<>();
            resposta.put("sagaId", sagaId);

            try {
                switch (action) {
                    case "CREATE_GERENTE" -> {
                        String cpf = String.valueOf(data.get("cpf"));
                        String nome = String.valueOf(data.get("nome"));
                        String email = String.valueOf(data.get("email"));
                        String telefone = data.containsKey("telefone") ? String.valueOf(data.get("telefone")) : null;
                        String senha = data.containsKey("senha") ? String.valueOf(data.get("senha")) : null;

                        GerenteResponse gerente = service.inserir(new GerenteRequest(cpf, nome, email, telefone));

                        Map<String, Object> payload = new HashMap<>((Map<String, Object>) data);
                        payload.put("cpf", gerente.cpf());
                        payload.put("nome", gerente.nome());
                        payload.put("email", gerente.email());
                        if (senha != null) payload.put("senha", senha);

                        resposta.put("action", "GERENTE_CREATED");
                        resposta.put("data", payload);
                    }
                    case "ROLLBACK_GERENTE" -> {
                        String cpf = String.valueOf(data.get("cpf"));
                        try { service.desativar(cpf); } catch (Exception ignored) {}
                        resposta.put("action", "GERENTE_ROLLBACK_DONE");
                        resposta.put("data", Map.of("cpf", cpf));
                    }
                    case "INACTIVATE_GERENTE" -> {
                        String cpf = String.valueOf(data.get("cpf"));
                        service.desativar(cpf);
                        Map<String, Object> payload = new HashMap<>((Map<String, Object>) data);
                        resposta.put("action", "GERENTE_INACTIVATED");
                        resposta.put("data", payload);
                    }
                    default -> { return; }
                }
            } catch (Exception e) {
                String errorAction = action.startsWith("INACTIVATE") ? "GERENTE_INACTIVATE_FAILED" : "GERENTE_FAILED";
                resposta.put("action", errorAction);
                resposta.put("data", data);
                resposta.put("erro", e.getMessage());
            }

            rabbit.convertAndSend("orquestrador.reply", mapper.writeValueAsString(resposta));
        } catch (Exception e) {
            System.err.println("[gerente.cmd] Erro ao processar mensagem: " + e.getMessage());
        }
    }

    @Configuration
    static class QueueConfig {
        @Bean
        public Queue gerenteCmdQueue() { return QueueBuilder.durable("gerente.cmd").build(); }

        @Bean
        public Queue orquestradorReplyQueue() { return QueueBuilder.durable("orquestrador.reply").build(); }
    }
}
