package com.bantads.msconta.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "eventos_processados")
public class EventoProcessado {

    @Id
    @Column(name = "event_id", nullable = false, updatable = false)
    private UUID eventId;

    @Convert(converter = Char4Converter.class)
    @Column(name = "objeto_id", nullable = false, length = 4)
    private String objetoId;

    @Column(name = "versao", nullable = false)
    private Integer versao;

    @Column(name = "processado_em", nullable = false)
    private OffsetDateTime processadoEm;

    public EventoProcessado() {
    }

    public EventoProcessado(UUID eventId, String objetoId, Integer versao, OffsetDateTime processadoEm) {
        this.eventId = eventId;
        this.objetoId = objetoId;
        this.versao = versao;
        this.processadoEm = processadoEm;
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

    public Integer getVersao() {
        return versao;
    }

    public void setVersao(Integer versao) {
        this.versao = versao;
    }

    public OffsetDateTime getProcessadoEm() {
        return processadoEm;
    }

    public void setProcessadoEm(OffsetDateTime processadoEm) {
        this.processadoEm = processadoEm;
    }
}
