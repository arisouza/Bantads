package com.bantads.ms_auth.messaging;

import com.bantads.ms_auth.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.util.HashMap;
import java.util.Map;

@Component
public class AuthConsumer {
    private static final String FILA = "ms.auth.cmd";

    private final AuthService authService;
    private final ComandoDedupe dedupe;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper mapper = new ObjectMapper();

    public AuthConsumer(AuthService authService, ComandoDedupe dedupe, RabbitTemplate rabbitTemplate) {
        this.authService = authService;
        this.dedupe = dedupe;
        this.rabbitTemplate = rabbitTemplate;
    }

    @RabbitListener(queues = FILA)
    public void handle(String mensagem) throws Exception {
        Map<?, ?> cmd = mapper.readValue(mensagem, Map.class);
        String sagaId = String.valueOf(cmd.get("sagaId"));
        String action = String.valueOf(cmd.get("action"));
        if (dedupe.jaProcessado(sagaId, action)) return;

        Map<?, ?> data = cmd.get("data") instanceof Map ? (Map<?, ?>) cmd.get("data") : Map.of();
        String cpf = (String) data.get("cpf");
        String email = (String) data.get("email");

        Map<String, Object> reply = new HashMap<>();
        reply.put("sagaId", sagaId);

        try {
            switch (action) {
                case "CREATE_AUTH" -> {
                    var result = authService.criarUsuario(new AuthService.CriarUsuarioCmd(cpf, email, null, "CLIENTE"));
                    reply.put("tipo", "AUTH_CREATED");
                    reply.put("payload", Map.of("cpf", cpf, "email", email, "senha", result.senha()));
                }
                case "CREATE_AUTH_GERENTE" -> {
                    authService.criarUsuario(new AuthService.CriarUsuarioCmd(cpf, email, (String) data.get("senha"), "GERENTE"));
                    reply.put("tipo", "AUTH_GERENTE_CREATED");
                    reply.put("payload", Map.of("cpf", cpf));
                }
                case "REVOKE_AUTH_GERENTE" -> {
                    authService.desativarUsuario(cpf);
                    reply.put("tipo", "AUTH_GERENTE_REVOKED");
                    reply.put("payload", Map.of("cpf", cpf));
                }
                case "REACTIVATE_AUTH_GERENTE" -> {
                    authService.reativarUsuario(cpf);
                    reply.put("tipo", "AUTH_GERENTE_REACTIVATED");
                    reply.put("payload", Map.of("cpf", cpf));
                }
                case "ROLLBACK_AUTH" -> {
                    authService.removerUsuario(cpf);
                    reply.put("tipo", "AUTH_ROLLBACK_DONE");
                    reply.put("payload", Map.of("cpf", cpf));
                }
                default -> { return; }
            }
        } catch (ResponseStatusException e) {
            reply.put("tipo", switch (action) {
                case "CREATE_AUTH" -> "AUTH_FAILED";
                case "CREATE_AUTH_GERENTE" -> "AUTH_GERENTE_FAILED";
                default -> "AUTH_GERENTE_REVOKE_FAILED";
            });
            reply.put("erro", e.getReason() != null ? e.getReason() : e.getMessage());
            reply.put("payload", Map.of("cpf", String.valueOf(cpf)));
        }

        rabbitTemplate.convertAndSend("orquestrador.reply", mapper.writeValueAsString(reply));
        dedupe.registrar(sagaId, action);
    }

    @Configuration
    static class QueueConfig {
        @Bean
        public DirectExchange bantadsDlx() { return new DirectExchange("bantads.dlx"); }

        @Bean
        public Queue authCmdDlq() { return QueueBuilder.durable(FILA + ".dlq").build(); }

        @Bean
        public Binding authCmdDlqBinding() { return BindingBuilder.bind(authCmdDlq()).to(bantadsDlx()).with(FILA + ".dlq"); }

        @Bean
        public Queue authCmdQueue() {
            return QueueBuilder.durable(FILA)
                .withArgument("x-dead-letter-exchange", "bantads.dlx")
                .withArgument("x-dead-letter-routing-key", FILA + ".dlq")
                .build();
        }

        @Bean
        public Queue orquestradorReplyQueue() { return QueueBuilder.durable("orquestrador.reply").build(); }
    }
}
