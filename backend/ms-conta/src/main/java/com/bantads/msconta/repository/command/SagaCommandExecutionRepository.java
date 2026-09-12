package com.bantads.msconta.repository.command;

import com.bantads.msconta.domain.entity.SagaCommandExecution;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SagaCommandExecutionRepository
        extends JpaRepository<SagaCommandExecution, UUID> {

    Optional<SagaCommandExecution>
    findBySagaIdAndTipo(
            String sagaId,
            String tipo
    );
}