package com.bantads.msconta.messaging;

import com.bantads.msconta.service.ContaProjectionService;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class ContaEventConsumer {

    private final ContaProjectionService contaProjectionService;

    public ContaEventConsumer(ContaProjectionService contaProjectionService) {
        this.contaProjectionService = contaProjectionService;
    }

    @RabbitListener(queues = "${bantads.rabbitmq.queues.conta-events}")
    public void consumir(ContaEventMessage evento) {
        contaProjectionService.projetar(evento);
    }
}
