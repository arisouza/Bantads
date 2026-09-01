package com.bantads.msconta.repository.event;

import com.bantads.msconta.domain.entity.EventStore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventStoreRepository extends JpaRepository<EventStore, UUID> {

    List<EventStore> findByObjetoIdOrderByVersaoAsc(String objetoId);

    Optional<EventStore> findTopByObjetoIdOrderByVersaoDesc(String objetoId);

    @Query("SELECT COALESCE(MAX(e.versao), 0) FROM EventStore e WHERE e.objetoId = :objetoId")
    int findMaxVersaoByObjetoId(@Param("objetoId") String objetoId);

    boolean existsByObjetoId(String objetoId);
}
