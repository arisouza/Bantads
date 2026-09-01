package com.bantads.msconta.messaging;

import com.bantads.msconta.domain.entity.EventStore;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class ContaEventPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;
    private final String contaEventsQueue;

    public ContaEventPublisher(
            RabbitTemplate rabbitTemplate,
            ObjectMapper objectMapper,
            @Value("${bantads.rabbitmq.queues.conta-events}") String contaEventsQueue
    ) {
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
        this.contaEventsQueue = contaEventsQueue;
    }

    public void publicar(EventStore evento) {
        try {
            ContaEventMessage mensagem = new ContaEventMessage();
            mensagem.setEventId(evento.getId());
            mensagem.setObjetoId(evento.getObjetoId());
            mensagem.setTipo(evento.getTipo());
            mensagem.setVersao(evento.getVersao());
            mensagem.setTimestamp(evento.getTimestamp());
            mensagem.setPayload(objectMapper.readValue(evento.getPayload(), new TypeReference<Map<String, Object>>() {
            }));
            rabbitTemplate.convertAndSend(contaEventsQueue, mensagem);
        } catch (Exception e) {
            throw new IllegalStateException("Erro ao publicar evento " + evento.getId(), e);
        }
    }
}
