package com.bantads.mscliente.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "solicitacoes", schema = "cliente")
public class SolicitacaoCadastro {
    @Id @Column(length = 11) private String cpf;
    @Column(nullable = false) private String nome;
    @Column(nullable = false, unique = true) private String email;
    @Column(nullable = false, length = 11) private String telefone;
    @Column(nullable = false, precision = 19, scale = 2) private BigDecimal salario;
    @Embedded private Endereco endereco;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private StatusSolicitacao status;
    @Column(name = "motivo_rejeicao") private String motivoRejeicao;
    @Column(name = "criado_em", nullable = false) private OffsetDateTime criadoEm;
    @Column(name = "atualizado_em", nullable = false) private OffsetDateTime atualizadoEm;
    protected SolicitacaoCadastro() {}
    public SolicitacaoCadastro(String cpf, String nome, String email, String telefone, BigDecimal salario, Endereco endereco) { this.cpf = cpf; this.nome = nome; this.email = email; this.telefone = telefone; this.salario = salario; this.endereco = endereco; this.status = StatusSolicitacao.PENDENTE; this.criadoEm = OffsetDateTime.now(); this.atualizadoEm = criadoEm; }
    public void aprovar() { validarPendente(); status = StatusSolicitacao.APROVADA; atualizadoEm = OffsetDateTime.now(); }
    public void rejeitar(String motivo) { validarPendente(); status = StatusSolicitacao.REJEITADA; motivoRejeicao = motivo; atualizadoEm = OffsetDateTime.now(); }
    private void validarPendente() { if (status != StatusSolicitacao.PENDENTE) throw new IllegalStateException("SolicitaÃ§Ã£o nÃ£o estÃ¡ pendente"); }
    public String getCpf() { return cpf; } public String getNome() { return nome; } public String getEmail() { return email; } public String getTelefone() { return telefone; } public BigDecimal getSalario() { return salario; } public Endereco getEndereco() { return endereco; } public StatusSolicitacao getStatus() { return status; } public String getMotivoRejeicao() { return motivoRejeicao; } public OffsetDateTime getCriadoEm() { return criadoEm; }
}
