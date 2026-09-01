package com.bantads.msconta.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "eventos_conta")
public class EventStore {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Convert(converter = Char4Converter.class)
    @Column(name = "objeto_id", nullable = false, length = 4)
    private String objetoId;

    @Column(name = "tipo", nullable = false, length = 50)
    private String tipo;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", nullable = false, columnDefinition = "jsonb")
    private String payload;

    @Column(name = "versao", nullable = false)
    private Integer versao;

    @Column(name = "timestamp", nullable = false)
    private OffsetDateTime timestamp;

    public EventStore() {
    }

    public EventStore(
            UUID id,
            String objetoId,
            String tipo,
            Integer versao,
            OffsetDateTime timestamp,
            String payload
    ) {
        this.id = id;
        this.objetoId = objetoId;
        this.tipo = tipo;
        this.versao = versao;
        this.timestamp = timestamp;
        this.payload = payload;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
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

    public Integer getVersao() {
        return versao;
    }

    public void setVersao(Integer versao) {
        this.versao = versao;
    }

    public OffsetDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(OffsetDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public String getPayload() {
        return payload;
    }

    public void setPayload(String payload) {
        this.payload = payload;
    }
}
