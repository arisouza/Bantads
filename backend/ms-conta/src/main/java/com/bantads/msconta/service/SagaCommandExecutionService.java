package com.bantads.msconta.service;

import com.bantads.msconta.domain.entity.SagaCommandExecution;
import com.bantads.msconta.domain.entity.SagaCommandStatus;
import com.bantads.msconta.repository.command.SagaCommandExecutionRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class SagaCommandExecutionService {

    private final SagaCommandExecutionRepository repository;

    public SagaCommandExecutionService(
            SagaCommandExecutionRepository repository
    ) {
        this.repository = repository;
    }

    @Transactional
    public Optional<SagaCommandExecution> iniciar(
            String sagaId,
            String tipo
    ) {
        Optional<SagaCommandExecution> existente =
                repository.findBySagaIdAndTipo(sagaId, tipo);

        if (existente.isPresent()) {
            return Optional.empty();
        }

        SagaCommandExecution execution = new SagaCommandExecution();

        execution.setSagaId(sagaId);
        execution.setTipo(tipo);
        execution.setStatus(SagaCommandStatus.PROCESSANDO);

        try {
            return Optional.of(repository.save(execution));

        } catch (DataIntegrityViolationException exception) {
            return Optional.empty();
        }
    }

    @Transactional
    public void concluir(
            SagaCommandExecution execution,
            String responsePayload
    ) {

        execution.setStatus(
                SagaCommandStatus.CONCLUIDO
        );

        execution.setResponsePayload(
                responsePayload
        );

        execution.setErro(null);

        repository.save(execution);
    }

    @Transactional
    public void falhar(
            SagaCommandExecution execution,
            String responsePayload,
            String erro
    ) {

        execution.setStatus(
                SagaCommandStatus.FALHA
        );

        execution.setResponsePayload(
                responsePayload
        );

        execution.setErro(erro);

        repository.save(execution);
    }
}