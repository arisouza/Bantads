package com.bantads.msgerente.repository;

import com.bantads.msgerente.dto.GerenteResponse;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class GerenteRepository {
    private final JdbcTemplate jdbc;

    public GerenteRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Optional<GerenteResponse> porCpf(String cpf) {
        return jdbc.query("SELECT cpf, nome, email FROM gerente.gerentes WHERE cpf = ?",
            (r, n) -> new GerenteResponse(r.getString("cpf"), r.getString("nome"), r.getString("email")), cpf)
            .stream().findFirst();
    }

    public java.util.List<GerenteResponse> listar() {
        return jdbc.query("SELECT cpf, nome, email FROM gerente.gerentes ORDER BY nome",
            (r, n) -> new GerenteResponse(r.getString("cpf"), r.getString("nome"), r.getString("email")));
    }
}
