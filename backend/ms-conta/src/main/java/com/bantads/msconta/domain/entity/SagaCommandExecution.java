package com.bantads.msconta.domain.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "saga_command_execution",
        schema = "conta",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_saga_command_execution",
                        columnNames = {
                                "saga_id",
                                "tipo"
                        }
                )
        }
)
public class SagaCommandExecution {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(
            name = "saga_id",
            nullable = false
    )
    private String sagaId;

    @Column(
            nullable = false
    )
    private String tipo;

    @Enumerated(EnumType.STRING)
    @Column(
            nullable = false
    )
    private SagaCommandStatus status;

    @Column(
            name = "erro",
            columnDefinition = "TEXT"
    )
    private String erro;

    @Column(
            name = "created_at",
            nullable = false
    )
    private LocalDateTime createdAt;

    @Column(
            name = "response_payload",
            columnDefinition = "TEXT"
    )
    private String responsePayload;

    @Column(
            name = "updated_at",
            nullable = false
    )
    private LocalDateTime updatedAt;

    public SagaCommandExecution() {
    }

    @PrePersist
    public void prePersist() {
        LocalDateTime agora = LocalDateTime.now();

        this.createdAt = agora;
        this.updatedAt = agora;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public String getSagaId() {
        return sagaId;
    }

    public void setSagaId(String sagaId) {
        this.sagaId = sagaId;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public SagaCommandStatus getStatus() {
        return status;
    }

    public void setStatus(
            SagaCommandStatus status
    ) {
        this.status = status;
    }

    public String getErro() {
        return erro;
    }

    public void setErro(String erro) {
        this.erro = erro;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public String getResponsePayload() {
        return responsePayload;
    }

    public void setResponsePayload(
            String responsePayload
    ) {
        this.responsePayload = responsePayload;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}