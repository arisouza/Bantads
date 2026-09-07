package com.bantads.mscliente.repository;

import com.bantads.mscliente.dto.ClienteResponse;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ClienteRepository {
    private final JdbcTemplate jdbc;

    public ClienteRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Optional<ClienteResponse> porCpf(String cpf) {
        return jdbc.query("SELECT cpf, nome, email FROM cliente.clientes WHERE cpf = ?",
            (r, n) -> new ClienteResponse(r.getString("cpf"), r.getString("nome"), r.getString("email")), cpf)
            .stream().findFirst();
    }
}
