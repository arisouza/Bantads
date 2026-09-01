package com.bantads.msconta.repository.query;

import com.bantads.msconta.domain.entity.MovimentacaoRead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface MovimentacaoReadRepository extends JpaRepository<MovimentacaoRead, UUID> {

    List<MovimentacaoRead> findByNumeroContaAndTimestampLessThanOrderByTimestampAsc(
            String numeroConta,
            OffsetDateTime timestamp
    );

    List<MovimentacaoRead> findByNumeroContaAndTimestampGreaterThanEqualAndTimestampLessThanEqualOrderByTimestampAsc(
            String numeroConta,
            OffsetDateTime inicio,
            OffsetDateTime fim
    );
}
