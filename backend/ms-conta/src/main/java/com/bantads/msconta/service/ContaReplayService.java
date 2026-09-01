package com.bantads.msconta.service;

import com.bantads.msconta.domain.entity.Conta;
import com.bantads.msconta.domain.entity.EventStore;
import com.bantads.msconta.domain.event.TipoEventoEnum;
import com.bantads.msconta.repository.event.EventStoreRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class ContaReplayService {

    private final EventStoreRepository eventStoreRepository;
    private final ObjectMapper objectMapper;

    public ContaReplayService(
            EventStoreRepository eventStoreRepository,
            ObjectMapper objectMapper
    ) {
        this.eventStoreRepository = eventStoreRepository;
        this.objectMapper = objectMapper;
    }

    public Conta reconstruirConta(String numeroConta) {
        List<EventStore> eventos =
                eventStoreRepository.findByObjetoIdOrderByVersaoAsc(numeroConta);

        Conta conta = new Conta();

        for (EventStore evento : eventos) {
            aplicarEvento(conta, evento);
        }

        return conta;
    }

    private void aplicarEvento(Conta conta, EventStore evento) {
        try {
            JsonNode payload = objectMapper.readTree(evento.getPayload());

            TipoEventoEnum tipo =
                    TipoEventoEnum.valueOf(evento.getTipo());

            switch (tipo) {
                case CRIADO -> aplicarCriado(conta, payload);
                case DEPOSITO -> aplicarDeposito(conta, payload);
                case SAQUE -> aplicarSaque(conta, payload);
                case TRANSFERENCIA_ORIGEM -> aplicarTransferenciaOrigem(conta, payload);
                case TRANSFERENCIA_DESTINO -> aplicarTransferenciaDestino(conta, payload);
                case GERENTE_ALTERADO -> aplicarGerenteAlterado(conta, payload);
            }

        } catch (Exception e) {
            throw new IllegalStateException(
                    "Erro ao aplicar evento " + evento.getEventId(),
                    e
            );
        }
    }

    private void aplicarCriado(Conta conta, JsonNode payload) {
        conta.setNumeroConta(payload.get("numeroConta").asText());
        conta.setCpfCliente(payload.get("cpfCliente").asText());
        conta.setCpfGerente(payload.get("cpfGerente").asText());
        conta.setDataCriacao(
                java.time.LocalDateTime.parse(
                        payload.get("dataCriacao").asText()
                )
        );
        conta.setSaldo(BigDecimal.ZERO);
    }

    private void aplicarDeposito(Conta conta, JsonNode payload) {
        BigDecimal valor = new BigDecimal(
                payload.get("valor").asText()
        );

        conta.setSaldo(conta.getSaldo().add(valor));
    }

    private void aplicarSaque(Conta conta, JsonNode payload) {
        BigDecimal valor = new BigDecimal(
                payload.get("valor").asText()
        );

        conta.setSaldo(conta.getSaldo().subtract(valor));
    }

    private void aplicarTransferenciaOrigem(
            Conta conta,
            JsonNode payload
    ) {
        BigDecimal valor = new BigDecimal(
                payload.get("valor").asText()
        );

        conta.setSaldo(conta.getSaldo().subtract(valor));
    }

    private void aplicarTransferenciaDestino(
            Conta conta,
            JsonNode payload
    ) {
        BigDecimal valor = new BigDecimal(
                payload.get("valor").asText()
        );

        conta.setSaldo(conta.getSaldo().add(valor));
    }

    private void aplicarGerenteAlterado(
            Conta conta,
            JsonNode payload
    ) {
        conta.setCpfGerente(
                payload.get("cpfGerenteNovo").asText()
        );
    }
}