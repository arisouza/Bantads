package com.bantads.msconta.repository.query;

import com.bantads.msconta.domain.entity.EventoProcessado;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface EventoProcessadoRepository extends JpaRepository<EventoProcessado, UUID> {

    boolean existsByEventId(UUID eventId);
}
