package com.bantads.msgerente.repository;

import com.bantads.msgerente.domain.Gerente;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GerenteRepository extends JpaRepository<Gerente, String> {
    List<Gerente> findAllByOrderByNomeAsc();
    List<Gerente> findByAtivoTrueOrderByNomeAsc();
    Optional<Gerente> findByCpfAndAtivoTrue(String cpf);
    boolean existsByEmail(String email);
}
