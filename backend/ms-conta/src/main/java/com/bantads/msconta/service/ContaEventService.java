package com.bantads.msconta.service;

import com.bantads.msconta.domain.entity.EventStore;
import com.bantads.msconta.domain.event.TipoEventoEnum;
import com.bantads.msconta.messaging.ContaEventPublisher;
import com.bantads.msconta.repository.event.EventStoreRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class ContaEventService {

    private final EventStoreRepository eventStoreRepository;
    private final ObjectMapper objectMapper;
    private final ContaEventPublisher contaEventPublisher;

    public ContaEventService(
            EventStoreRepository eventStoreRepository,
            ObjectMapper objectMapper,
            ContaEventPublisher contaEventPublisher
    ) {
        this.eventStoreRepository = eventStoreRepository;
        this.objectMapper = objectMapper;
        this.contaEventPublisher = contaEventPublisher;
    }

    @Transactional
    public EventStore registrarEvento(String numeroConta, TipoEventoEnum tipo, Object payload) {
        try {
            String payloadJson = objectMapper.writeValueAsString(payload);
            int proximaVersao = eventStoreRepository.findMaxVersaoByObjetoId(numeroConta) + 1;

            EventStore evento = new EventStore(
                    UUID.randomUUID(),
                    numeroConta,
                    tipo.getValor(),
                    proximaVersao,
                    OffsetDateTime.now(),
                    payloadJson
            );

            EventStore salvo = eventStoreRepository.saveAndFlush(evento);
            publicarAposCommit(salvo);
            return salvo;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException(
                    "Erro ao registrar evento para a conta " + numeroConta,
                    e
            );
        }
    }

    private void publicarAposCommit(EventStore evento) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            contaEventPublisher.publicar(evento);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                contaEventPublisher.publicar(evento);
            }
        });
    }
}
