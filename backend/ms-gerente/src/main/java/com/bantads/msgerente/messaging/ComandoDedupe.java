package com.bantads.msgerente.messaging;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class ComandoDedupe {
    private final JdbcTemplate jdbc;

    public ComandoDedupe(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public boolean jaProcessado(String sagaId, String tipo) {
        return !jdbc.queryForList("SELECT 1 FROM gerente.comandos_processados WHERE saga_id = ? AND tipo = ?", sagaId, tipo).isEmpty();
    }

    public void registrar(String sagaId, String tipo) {
        jdbc.update("INSERT INTO gerente.comandos_processados (saga_id, tipo) VALUES (?, ?) ON CONFLICT DO NOTHING", sagaId, tipo);
    }
}
