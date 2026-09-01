package com.bantads.msconta.repository.event;

import com.bantads.msconta.domain.entity.EventStore;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EventStoreRepository extends JpaRepository<EventStore, UUID> {

    List<EventStore> findByObjetoIdOrderByVersaoAsc(String objetoId);

    long countByObjetoId(String objetoId);
}