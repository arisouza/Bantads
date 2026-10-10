package com.bantads.msgerente.repository;

import com.bantads.msgerente.dto.GerenteRequest;
import com.bantads.msgerente.dto.GerenteResponse;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class GerenteRepository {
    private final JdbcTemplate jdbc;

    public GerenteRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    private static GerenteResponse mapRow(java.sql.ResultSet r, int n) throws java.sql.SQLException {
        return new GerenteResponse(r.getString("cpf"), r.getString("nome"), r.getString("email"),
            r.getString("telefone"), r.getBoolean("ativo"));
    }

    public Optional<GerenteResponse> porCpf(String cpf) {
        return jdbc.query("SELECT cpf, nome, email, telefone, ativo FROM gerente.gerentes WHERE cpf = ?",
            GerenteRepository::mapRow, cpf).stream().findFirst();
    }

    public List<GerenteResponse> listar() {
        return jdbc.query("SELECT cpf, nome, email, telefone, ativo FROM gerente.gerentes ORDER BY nome",
            GerenteRepository::mapRow);
    }

    public List<GerenteResponse> listarAtivos() {
        return jdbc.query("SELECT cpf, nome, email, telefone, ativo FROM gerente.gerentes WHERE ativo = TRUE ORDER BY nome",
            GerenteRepository::mapRow);
    }

    public boolean existePorCpf(String cpf) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM gerente.gerentes WHERE cpf = ?", Integer.class, cpf);
        return count != null && count > 0;
    }

    public boolean existePorEmail(String email) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM gerente.gerentes WHERE email = ?", Integer.class, email);
        return count != null && count > 0;
    }

    public void inserir(GerenteRequest req) {
        jdbc.update("INSERT INTO gerente.gerentes (cpf, nome, email, telefone, ativo) VALUES (?, ?, ?, ?, TRUE)",
            req.cpf(), req.nome(), req.email(), req.telefone());
    }

    public int atualizar(String cpf, String nome, String telefone) {
        return jdbc.update("UPDATE gerente.gerentes SET nome = ?, telefone = ? WHERE cpf = ? AND ativo = TRUE",
            nome, telefone, cpf);
    }

    public int desativar(String cpf) {
        return jdbc.update("UPDATE gerente.gerentes SET ativo = FALSE WHERE cpf = ?", cpf);
    }

    public int reativar(String cpf) {
        return jdbc.update("UPDATE gerente.gerentes SET ativo = TRUE WHERE cpf = ?", cpf);
    }

    public int remover(String cpf) {
        return jdbc.update("DELETE FROM gerente.gerentes WHERE cpf = ?", cpf);
    }

    public void reboot() {
        jdbc.update("DELETE FROM gerente.gerentes");
        jdbc.update("INSERT INTO gerente.gerentes (cpf, nome, email, telefone, ativo) VALUES (?, ?, ?, ?, TRUE)",
            "98574307084", "Geniéve", "ger1@bantads.com.br", "41988880001");
        jdbc.update("INSERT INTO gerente.gerentes (cpf, nome, email, telefone, ativo) VALUES (?, ?, ?, ?, TRUE)",
            "64065268052", "Godophredo", "ger2@bantads.com.br", "41988880002");
        jdbc.update("INSERT INTO gerente.gerentes (cpf, nome, email, telefone, ativo) VALUES (?, ?, ?, ?, TRUE)",
            "23862179060", "Gyândula", "ger3@bantads.com.br", "41988880003");
        jdbc.update("INSERT INTO gerente.gerentes (cpf, nome, email, telefone, ativo) VALUES (?, ?, ?, ?, TRUE)",
            "40501740066", "Gadamântio", "ger4@bantads.com.br", "41988880004");
    }
}
