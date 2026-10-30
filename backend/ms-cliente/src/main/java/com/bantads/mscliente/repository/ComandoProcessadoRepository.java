package com.bantads.mscliente.repository;

import com.bantads.mscliente.domain.ComandoProcessado;
import com.bantads.mscliente.domain.ComandoProcessadoId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComandoProcessadoRepository extends JpaRepository<ComandoProcessado, ComandoProcessadoId> {}

