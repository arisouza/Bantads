package com.bantads.mscliente.domain;

import java.io.Serializable;
import java.util.Objects;

public class ComandoProcessadoId implements Serializable {
    private String sagaId;
    private String tipo;

    public ComandoProcessadoId() {}

    public ComandoProcessadoId(String sagaId, String tipo) {
        this.sagaId = sagaId;
        this.tipo = tipo;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ComandoProcessadoId that)) return false;
        return Objects.equals(sagaId, that.sagaId) && Objects.equals(tipo, that.tipo);
    }

    @Override
    public int hashCode() {
        return Objects.hash(sagaId, tipo);
    }
}

