package com.bantads.mscliente.messaging;

import com.bantads.mscliente.dto.SolicitacaoResponse;
import com.bantads.mscliente.service.ClienteService;
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
public class ClienteSagaConsumer {
    private final ClienteService service;
    private final RabbitTemplate rabbit;
    private final ObjectMapper mapper;
    public ClienteSagaConsumer(ClienteService service, RabbitTemplate rabbit, ObjectMapper mapper) { this.service = service; this.rabbit = rabbit; this.mapper = mapper; }

    @RabbitListener(queues = "cliente.cmd")
    public void consumir(String mensagem) {
        try {
            Map<?, ?> comando = mapper.readValue(mensagem, Map.class);
            String sagaId = String.valueOf(comando.get("sagaId"));
            String action = String.valueOf(comando.get("action"));
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
                    service.rollbackCliente(cpf);
                    resposta.put("tipo", "CLIENTE_ROLLBACK_DONE");
                    resposta.put("payload", Map.of("cpf", cpf));
                } else return;
            } catch (Exception e) {
                resposta.put("tipo", "CLIENTE_FAILED");
                resposta.put("payload", Map.of("cpf", cpf));
                resposta.put("erro", e.getMessage());
            }
            rabbit.convertAndSend("orquestrador.reply", mapper.writeValueAsString(resposta));
        } catch (Exception e) { System.err.println("[cliente.cmd] Erro ao processar mensagem: " + e.getMessage()); }
    }

    @Configuration
    static class QueueConfig { @Bean Queue clienteCmdQueue() { return QueueBuilder.durable("cliente.cmd").build(); } }
}
