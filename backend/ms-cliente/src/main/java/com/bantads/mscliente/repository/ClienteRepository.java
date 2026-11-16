package com.bantads.mscliente.repository;

import com.bantads.mscliente.domain.Cliente;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClienteRepository extends JpaRepository<Cliente, String> {
    boolean existsByCpfOrEmail(String cpf, String email);
    List<Cliente> findByCpfContainingIgnoreCaseOrNomeContainingIgnoreCaseOrderByNomeAsc(String cpf, String nome);
    List<Cliente> findByCpfContainingIgnoreCaseOrderByNomeAsc(String cpf);
    List<Cliente> findByNomeContainingIgnoreCaseOrderByNomeAsc(String nome);
}
