package com.bantads.msgerente.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "gerentes", schema = "gerente")
public class Gerente {
    @Id
    @Column(length = 11)
    private String cpf;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false, unique = true)
    private String email;

    private String telefone;

    @Column(nullable = false)
    private boolean ativo;

    protected Gerente() {}

    public Gerente(String cpf, String nome, String email, String telefone, boolean ativo) {
        this.cpf = cpf;
        this.nome = nome;
        this.email = email;
        this.telefone = telefone;
        this.ativo = ativo;
    }

    public void atualizarDados(String nome, String telefone) {
        this.nome = nome;
        this.telefone = telefone;
    }

    public void desativar() { this.ativo = false; }
    public void reativar() { this.ativo = true; }

    public String getCpf() { return cpf; }
    public String getNome() { return nome; }
    public String getEmail() { return email; }
    public String getTelefone() { return telefone; }
    public boolean isAtivo() { return ativo; }
}

