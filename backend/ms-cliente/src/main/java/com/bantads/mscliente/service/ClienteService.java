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
            throw new ResponseStatusException(HttpStatus.CONFLICT, "CPF ou e-mail jÃ¡ cadastrado");
        }
        solicitacoes.save(new SolicitacaoCadastro(solicitacao.cpf(), solicitacao.nome(), solicitacao.email(), solicitacao.telefone(), solicitacao.salario(), endereco(solicitacao)));
    }

    public List<SolicitacaoResponse> listarSolicitacoes() { return solicitacoes.findByStatusOrderByCriadoEmAsc(StatusSolicitacao.PENDENTE).stream().map(this::dto).toList(); }
    public SolicitacaoResponse solicitacaoPorCpf(String cpf) { return dto(solicitacaoEntidade(cpf)); }
    /* ImplementaÃ§Ã£o JDBC anterior, mantida apenas no histÃ³rico do diff.
    public void rejeitar(String cpf, String motivo) {
        if (repository.rejeitar(cpf, motivo) == 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "SolicitaÃ§Ã£o nÃ£o estÃ¡ pendente");
    }
    @Transactional
    public SolicitacaoResponse criarClienteDaSolicitacao(String cpf) {
        SolicitacaoResponse solicitacao = solicitacaoPorCpf(cpf);
        if (!"PENDENTE".equals(solicitacao.status())) throw new ResponseStatusException(HttpStatus.CONFLICT, "SolicitaÃ§Ã£o nÃ£o estÃ¡ pendente");
        if (repository.clienteExiste(solicitacao.cpf(), solicitacao.email())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Cliente jÃ¡ existe");
        repository.inserirCliente(solicitacao);
        repository.aprovar(cpf);
        return solicitacao;
    }
    @Transactional
    public void rollbackCliente(String cpf) { repository.removerCliente(cpf); }
    public void reboot() { repository.reboot(); }
    */

    @Transactional
    public void rejeitar(String cpf, String motivo) {
        try { solicitacaoEntidade(cpf).rejeitar(motivo); }
        catch (IllegalStateException e) { throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage()); }
    }

    @Transactional
    public SolicitacaoResponse criarClienteDaSolicitacao(String cpf) {
        SolicitacaoCadastro solicitacao = solicitacaoEntidade(cpf);
        if (clientes.existsByCpfOrEmail(solicitacao.getCpf(), solicitacao.getEmail())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Cliente ja existe");
        try { solicitacao.aprovar(); }
        catch (IllegalStateException e) { throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage()); }
        clientes.save(new Cliente(solicitacao.getCpf(), solicitacao.getNome(), solicitacao.getEmail(), solicitacao.getTelefone(), solicitacao.getSalario(), solicitacao.getEndereco()));
        return dto(solicitacao);
    }

    @Transactional public void rollbackCliente(String cpf) { clientes.deleteById(cpf); }
    @Transactional
    public void reboot() {
        solicitacoes.deleteAll(); clientes.deleteAll();
        clientes.saveAll(List.of(new Cliente("12912861012", "Catharyna", "cli1@bantads.com.br", null, null, null), new Cliente("09506382000", "Cleudenio", "cli2@bantads.com.br", null, null, null), new Cliente("85733854057", "Catianna", "cli3@bantads.com.br", null, null, null), new Cliente("58872160006", "Cutardo", "cli4@bantads.com.br", null, null, null), new Cliente("76179646090", "Candrya", "cli5@bantads.com.br", null, null, null)));
    }

    private SolicitacaoCadastro solicitacaoEntidade(String cpf) { return solicitacoes.findById(cpf).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND)); }
    private Endereco endereco(SolicitacaoRequest r) { return new Endereco(r.logradouro(), r.numero(), r.complemento(), r.cep(), r.cidade(), r.uf()); }
    private EnderecoResponse dto(Endereco e) { return e == null ? null : new EnderecoResponse(e.getLogradouro(), e.getNumero(), e.getComplemento(), e.getCep(), e.getCidade(), e.getUf()); }
    private ClienteResponse dto(Cliente c) { return new ClienteResponse(c.getCpf(), c.getNome(), c.getEmail(), c.getTelefone(), c.getSalario(), dto(c.getEndereco())); }
    private SolicitacaoResponse dto(SolicitacaoCadastro s) { return new SolicitacaoResponse(s.getCpf(), s.getNome(), s.getEmail(), s.getTelefone(), s.getSalario(), dto(s.getEndereco()), s.getStatus().name(), s.getMotivoRejeicao(), s.getCriadoEm()); }
}
