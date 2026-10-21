package com.bantads.mscliente.repository;

import com.bantads.mscliente.domain.SolicitacaoCadastro;
import com.bantads.mscliente.domain.StatusSolicitacao;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SolicitacaoRepository extends JpaRepository<SolicitacaoCadastro, String> {
    boolean existsByCpfOrEmail(String cpf, String email);
    List<SolicitacaoCadastro> findByStatusOrderByCriadoEmAsc(StatusSolicitacao status);
    List<SolicitacaoCadastro> findAllByOrderByCriadoEmAsc();

    @Modifying
    @Query("update SolicitacaoCadastro s set s.status = :rejeitada, s.motivoRejeicao = :motivo, s.atualizadoEm = :atualizadoEm "
        + "where s.cpf = :cpf and s.status = :pendente")
    int rejeitarSePendente(
        @Param("cpf") String cpf,
        @Param("motivo") String motivo,
        @Param("atualizadoEm") OffsetDateTime atualizadoEm,
        @Param("pendente") StatusSolicitacao pendente,
        @Param("rejeitada") StatusSolicitacao rejeitada
    );
}
