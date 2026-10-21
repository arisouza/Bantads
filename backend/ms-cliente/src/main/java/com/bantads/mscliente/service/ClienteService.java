package com.bantads.mscliente.service;

import com.bantads.mscliente.domain.Cliente;
import com.bantads.mscliente.domain.Endereco;
import com.bantads.mscliente.domain.SolicitacaoCadastro;
import com.bantads.mscliente.domain.StatusSolicitacao;
import com.bantads.mscliente.dto.ClienteResponse;
import com.bantads.mscliente.dto.EnderecoResponse;
import com.bantads.mscliente.dto.SolicitacaoRequest;
import com.bantads.mscliente.dto.SolicitacaoResponse;
import com.bantads.mscliente.repository.ClienteRepository;
import com.bantads.mscliente.repository.SolicitacaoRepository;
import java.util.List;
import java.time.OffsetDateTime;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ClienteService {
    private final ClienteRepository clientes;
    private final SolicitacaoRepository solicitacoes;

    public ClienteService(ClienteRepository clientes, SolicitacaoRepository solicitacoes) { this.clientes = clientes; this.solicitacoes = solicitacoes; }

    public ClienteResponse porCpf(String cpf) {
        return clientes.findById(cpf).map(this::dto).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    public List<ClienteResponse> listar(String busca) {
        String termo = busca == null ? "" : busca.trim();
        return clientes.findByCpfContainingIgnoreCaseOrNomeContainingIgnoreCaseOrderByNomeAsc(termo, termo).stream().map(this::dto).toList();
    }

    @Transactional
    public void solicitar(SolicitacaoRequest solicitacao) {
        if (clientes.existsByCpfOrEmail(solicitacao.cpf(), solicitacao.email()) || solicitacoes.existsByCpfOrEmail(solicitacao.cpf(), solicitacao.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "CPF ou e-mail já cadastrado");
        }
        solicitacoes.save(new SolicitacaoCadastro(solicitacao.cpf(), solicitacao.nome(), solicitacao.email(), solicitacao.telefone(), solicitacao.salario(), endereco(solicitacao)));
    }

    public List<SolicitacaoResponse> listarSolicitacoes() { return solicitacoes.findAllByOrderByCriadoEmAsc().stream().map(this::dto).toList(); }
    public SolicitacaoResponse solicitacaoPorCpf(String cpf) { return dto(solicitacaoEntidade(cpf)); }
    @Transactional
    public SolicitacaoResponse rejeitar(String cpf, String motivo) {
        if (motivo == null || motivo.trim().isEmpty() || motivo.trim().length() > 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Motivo da rejeição é obrigatório e deve ter até 500 caracteres");
        }
        String motivoNormalizado = motivo.trim();
        int atualizadas = solicitacoes.rejeitarSePendente(
            cpf,
            motivoNormalizado,
            OffsetDateTime.now(),
            StatusSolicitacao.PENDENTE,
            StatusSolicitacao.REJEITADA
        );
        if (atualizadas == 0) {
            if (solicitacoes.findById(cpf).isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Solicitação não está pendente");
        }
        return dto(solicitacaoEntidade(cpf));
    }

    @Transactional
    public SolicitacaoResponse criarClienteDaSolicitacao(String cpf) {
        SolicitacaoCadastro solicitacao = solicitacaoEntidade(cpf);
        if (clientes.existsByCpfOrEmail(solicitacao.getCpf(), solicitacao.getEmail())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Cliente já existe");
        try { solicitacao.aprovar(); }
        catch (IllegalStateException e) { throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage()); }
        clientes.save(new Cliente(solicitacao.getCpf(), solicitacao.getNome(), solicitacao.getEmail(), solicitacao.getTelefone(), solicitacao.getSalario(), solicitacao.getEndereco()));
        return dto(solicitacao);
    }

    @Transactional
    public void rollbackCliente(String cpf, String motivoNaoAprovada) {
        clientes.deleteById(cpf);
        solicitacoes.findById(cpf).ifPresent(s -> s.reabrir(motivoNaoAprovada));
    }

    @Transactional
    public void reboot() {
        solicitacoes.deleteAll();
        clientes.deleteAll();
        clientes.saveAll(List.of(
            new Cliente("12912861012", "Catharyna", "cli1@bantads.com.br", "41999990001", new java.math.BigDecimal("10000.00"), null),
            new Cliente("09506382000", "Cleuddônio", "cli2@bantads.com.br", "41999990002", new java.math.BigDecimal("20000.00"), null),
            new Cliente("85733854057", "Catianna", "cli3@bantads.com.br", "41999990003", new java.math.BigDecimal("3000.00"), null),
            new Cliente("58872160006", "Cutardo", "cli4@bantads.com.br", "41999990004", new java.math.BigDecimal("500.00"), null),
            new Cliente("76179646090", "Coândrya", "cli5@bantads.com.br", "41999990005", new java.math.BigDecimal("1500.00"), null)
        ));
    }

    private SolicitacaoCadastro solicitacaoEntidade(String cpf) { return solicitacoes.findById(cpf).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND)); }
    private Endereco endereco(SolicitacaoRequest r) { return new Endereco(r.logradouro(), r.numero(), r.complemento(), r.cep(), r.cidade(), r.uf()); }
    private EnderecoResponse dto(Endereco e) { return e == null ? null : new EnderecoResponse(e.getLogradouro(), e.getNumero(), e.getComplemento(), e.getCep(), e.getCidade(), e.getUf()); }
    private ClienteResponse dto(Cliente c) { return new ClienteResponse(c.getCpf(), c.getNome(), c.getEmail(), c.getTelefone(), c.getSalario(), dto(c.getEndereco())); }
    private SolicitacaoResponse dto(SolicitacaoCadastro s) { return new SolicitacaoResponse(s.getCpf(), s.getNome(), s.getEmail(), s.getTelefone(), s.getSalario(), dto(s.getEndereco()), s.getStatus().name(), s.getMotivoRejeicao(), s.getCriadoEm(), s.getAtualizadoEm()); }
}
