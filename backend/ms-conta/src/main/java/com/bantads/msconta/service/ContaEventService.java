package com.bantads.msconta.service;

import com.bantads.msconta.domain.entity.EventStore;
import com.bantads.msconta.domain.event.TipoEventoEnum;
import com.bantads.msconta.repository.event.EventStoreRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class ContaEventService {

    private final EventStoreRepository eventStoreRepository;
    private final ObjectMapper objectMapper;

    public ContaEventService(
            EventStoreRepository eventStoreRepository,
            ObjectMapper objectMapper
    ) {
        this.eventStoreRepository = eventStoreRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public EventStore registrarEvento(
            String numeroConta,
            TipoEventoEnum tipo,
            Object payload
    ) {
        try {
            String payloadJson = objectMapper.writeValueAsString(payload);

            long proximaVersao =
                    eventStoreRepository.countByObjetoId(numeroConta) + 1;

            EventStore evento = new EventStore(
                    UUID.randomUUID(),
                    numeroConta,
                    tipo.name(),
                    proximaVersao,
                    LocalDateTime.now(),
                    payloadJson
            );

            return eventStoreRepository.save(evento);

        } catch (Exception e) {
            throw new IllegalStateException(
                    "Erro ao registrar evento para a conta " + numeroConta,
                    e
            );
        }
    }
}