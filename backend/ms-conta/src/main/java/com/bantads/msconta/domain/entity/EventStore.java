package com.bantads.msconta.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "event_store")
public class EventStore {

    @Id
    @Column(name = "event_id", nullable = false, updatable = false)
    private UUID eventId;

    @Column(name = "objeto_id", nullable = false, length = 4)
    private String objetoId;

    @Column(name = "tipo", nullable = false)
    private String tipo;

    @Column(name = "versao", nullable = false)
    private Long versao;

    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "payload", nullable = false, columnDefinition = "jsonb")
    private String payload;

    public EventStore() {
    }

    public EventStore(
            UUID eventId,
            String objetoId,
            String tipo,
            Long versao,
            LocalDateTime timestamp,
            String payload
    ) {
        this.eventId = eventId;
        this.objetoId = objetoId;
        this.tipo = tipo;
        this.versao = versao;
        this.timestamp = timestamp;
        this.payload = payload;
    }

    public UUID getEventId() {
        return eventId;
    }

    public void setEventId(UUID eventId) {
        this.eventId = eventId;
    }

    public String getObjetoId() {
        return objetoId;
    }

    public void setObjetoId(String objetoId) {
        this.objetoId = objetoId;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public Long getVersao() {
        return versao;
    }

    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public String getPayload() {
        return payload;
    }

    public void setPayload(String payload) {
        this.payload = payload;
    }
}