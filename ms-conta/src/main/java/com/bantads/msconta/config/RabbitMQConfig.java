package com.bantads.msconta.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    @Value("${bantads.rabbitmq.queues.conta-cmd}")
    private String contaCmdQueue;

    @Value("${bantads.rabbitmq.queues.conta-events}")
    private String contaEventsQueue;

    @Value("${bantads.rabbitmq.queues.conta-events-dlq}")
    private String contaEventsDlqQueue;

    @Value("${bantads.rabbitmq.queues.conta-cmd-dlq}")
    private String contaCmdDlqQueue;

    @Value("${bantads.rabbitmq.queues.orquestrador-reply}")
    private String orquestradorReplyQueue;

    // DLX (Dead Letter Exchange) para filas com retry
    @Bean
    public DirectExchange dlxExchange() {
        return new DirectExchange("bantads.dlx");
    }

    // Fila de comandos SAGA para MS Conta
    @Bean
    public Queue contaCmdQueue() {
        return QueueBuilder.durable(contaCmdQueue)
                .withArgument("x-dead-letter-exchange", "bantads.dlx")
                .withArgument("x-dead-letter-routing-key", contaCmdDlqQueue)
                .build();
    }

    @Bean
    public Queue contaCmdDlqQueue() {
        return QueueBuilder.durable(contaCmdDlqQueue).build();
    }

    // Fila de eventos CQRS (command -> query)
    @Bean
    public Queue contaEventsQueue() {
        return QueueBuilder.durable(contaEventsQueue)
                .withArgument("x-dead-letter-exchange", "bantads.dlx")
                .withArgument("x-dead-letter-routing-key", contaEventsDlqQueue)
                .build();
    }

    @Bean
    public Queue contaEventsDlqQueue() {
        return QueueBuilder.durable(contaEventsDlqQueue).build();
    }

    // Fila de resposta ao orquestrador
    @Bean
    public Queue orquestradorReplyQueue() {
        return QueueBuilder.durable(orquestradorReplyQueue).build();
    }

    // Bindings para DLX
    @Bean
    public Binding contaCmdDlqBinding() {
        return BindingBuilder.bind(contaCmdDlqQueue()).to(dlxExchange()).with(contaCmdDlqQueue);
    }

    @Bean
    public Binding contaEventsDlqBinding() {
        return BindingBuilder.bind(contaEventsDlqQueue()).to(dlxExchange()).with(contaEventsDlqQueue);
    }

    // Conversor JSON para mensagens RabbitMQ
    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter());
        return template;
    }

    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(ConnectionFactory connectionFactory) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(messageConverter());
        return factory;
    }
}
