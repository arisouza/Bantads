package com.bantads.msgerente.repository;

import com.bantads.msgerente.domain.ComandoProcessado;
import com.bantads.msgerente.domain.ComandoProcessadoId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComandoProcessadoRepository extends JpaRepository<ComandoProcessado, ComandoProcessadoId> {}

