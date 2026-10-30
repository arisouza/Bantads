package com.bantads.msgerente.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

@Entity
@Table(name = "comandos_processados", schema = "gerente")
@IdClass(ComandoProcessadoId.class)
public class ComandoProcessado {
    @Id
    @Column(name = "saga_id", nullable = false)
    private String sagaId;

    @Id
    @Column(name = "tipo", nullable = false)
    private String tipo;

    protected ComandoProcessado() {}

    public ComandoProcessado(String sagaId, String tipo) {
        this.sagaId = sagaId;
        this.tipo = tipo;
    }

    public String getSagaId() { return sagaId; }
    public String getTipo() { return tipo; }
}

