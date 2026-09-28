package com.bantads.ms_auth.messaging;

import com.bantads.ms_auth.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class AuthConsumer {

    private final AuthService authService;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper mapper;

    public AuthConsumer(AuthService authService, RabbitTemplate rabbitTemplate) {
        this.authService = authService;
        this.rabbitTemplate = rabbitTemplate;
        this.mapper = new ObjectMapper();
    }

    @RabbitListener(queues = "auth.cmd")
    public void handle(String mensagem) {
        try {
            Map<?, ?> cmd = mapper.readValue(mensagem, Map.class);
            String sagaId = (String) cmd.get("sagaId");
            String action = (String) cmd.get("action");
            Map<?, ?> data = cmd.get("data") instanceof Map ? (Map<?, ?>) cmd.get("data") : Map.of();

            Map<String, Object> reply = new HashMap<>();
            reply.put("sagaId", sagaId);

            if ("CREATE_AUTH".equals(action)) {
                try {
                    String cpf = (String) data.get("cpf");
                    String email = (String) data.get("email");
                    String tipo = "CLIENTE";

                    var result = authService.criarUsuario(new AuthService.CriarUsuarioCmd(cpf, email, null, tipo));

                    Map<String, Object> replyData = new HashMap<>((Map<String, Object>) data);
                    replyData.put("senha", result.senha());
                    replyData.put("cpf", cpf);

                    reply.put("tipo", "AUTH_CREATED");
                    reply.put("payload", replyData);
                } catch (Exception e) {
                    reply.put("tipo", "AUTH_FAILED");
                    reply.put("erro", e.getMessage());
                    reply.put("payload", data);
                }

            } else if ("CREATE_AUTH_GERENTE".equals(action)) {
                try {
                    String cpf = (String) data.get("cpf");
                    String email = (String) data.get("email");
                    String senha = (String) data.get("senha");

                    authService.criarUsuario(new AuthService.CriarUsuarioCmd(cpf, email, senha, "GERENTE"));

                    reply.put("tipo", "AUTH_GERENTE_CREATED");
                    reply.put("payload", data);
                } catch (Exception e) {
                    reply.put("tipo", "AUTH_GERENTE_FAILED");
                    reply.put("erro", e.getMessage());
                    reply.put("payload", data);
                }

            } else if ("REVOKE_AUTH_GERENTE".equals(action)) {
                String cpf = (String) data.get("cpf");
                try {
                    authService.desativarUsuario(cpf);
                } catch (Exception ignored) {}

                reply.put("tipo", "AUTH_GERENTE_REVOKED");
                reply.put("payload", data);
            }

            if (reply.containsKey("tipo")) {
                rabbitTemplate.convertAndSend("orquestrador.reply", mapper.writeValueAsString(reply));
            }

        } catch (Exception e) {
            System.err.println("[auth.cmd] Erro ao processar mensagem: " + e.getMessage());
        }
    }

    @Configuration
    static class QueueConfig {
        @Bean
        public Queue authCmdQueue() {
            return QueueBuilder.durable("auth.cmd").build();
        }

        @Bean
        public Queue orquestradorReplyQueue() {
            return QueueBuilder.durable("orquestrador.reply").build();
        }
    }
}
