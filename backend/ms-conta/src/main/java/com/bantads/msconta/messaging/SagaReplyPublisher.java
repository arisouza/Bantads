package com.bantads.msconta.messaging;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class SagaReplyPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final String replyQueue;

    public SagaReplyPublisher(
            RabbitTemplate rabbitTemplate,
            @Value("${bantads.rabbitmq.queues.orquestrador-reply}") String replyQueue
    ) {
        this.rabbitTemplate = rabbitTemplate;
        this.replyQueue = replyQueue;
    }

    public void publicar(SagaReplyMessage mensagem) {
        rabbitTemplate.convertAndSend(
                replyQueue,
                mensagem
        );
    }
}