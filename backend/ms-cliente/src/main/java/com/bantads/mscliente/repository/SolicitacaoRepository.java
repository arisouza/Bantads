package com.bantads.mscliente.repository;

import com.bantads.mscliente.domain.SolicitacaoCadastro;
import com.bantads.mscliente.domain.StatusSolicitacao;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SolicitacaoRepository extends JpaRepository<SolicitacaoCadastro, String> {
    boolean existsByCpfOrEmail(String cpf, String email);
    List<SolicitacaoCadastro> findByStatusOrderByCriadoEmAsc(StatusSolicitacao status);
}
