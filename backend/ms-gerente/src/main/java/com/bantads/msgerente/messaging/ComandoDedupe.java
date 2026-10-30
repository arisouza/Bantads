package com.bantads.msgerente.messaging;

import com.bantads.msgerente.domain.ComandoProcessado;
import com.bantads.msgerente.domain.ComandoProcessadoId;
import com.bantads.msgerente.repository.ComandoProcessadoRepository;
import org.springframework.stereotype.Component;

@Component
public class ComandoDedupe {
    private final ComandoProcessadoRepository repository;

    public ComandoDedupe(ComandoProcessadoRepository repository) {
        this.repository = repository;
    }

    public boolean jaProcessado(String sagaId, String tipo) {
        return repository.existsById(new ComandoProcessadoId(sagaId, tipo));
    }

    public void registrar(String sagaId, String tipo) {
        ComandoProcessadoId id = new ComandoProcessadoId(sagaId, tipo);
        if (!repository.existsById(id)) {
            repository.save(new ComandoProcessado(sagaId, tipo));
        }
    }

    public void limpar() {
        repository.deleteAll();
    }
}
