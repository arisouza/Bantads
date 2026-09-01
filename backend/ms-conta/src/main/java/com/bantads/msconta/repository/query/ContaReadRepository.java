package com.bantads.msconta.repository.query;

import com.bantads.msconta.domain.entity.ContaRead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ContaReadRepository extends JpaRepository<ContaRead, String> {

    Optional<ContaRead> findByCpfCliente(String cpfCliente);

    List<ContaRead> findByCpfGerente(String cpfGerente);

    long countByCpfGerente(String cpfGerente);
}
