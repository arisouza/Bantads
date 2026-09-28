package com.bantads.ms_auth.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("usuarios")
public class Usuario {
    @Id private String id;
    private String cpf;
    @Indexed(name = "email_1", unique = true) private String email;
    private String senha;
    private String tipo;
    private boolean ativo;

    public Usuario() {}

    public Usuario(String cpf, String email, String senha, String tipo, boolean ativo) {
        this.cpf = cpf;
        this.email = email;
        this.senha = senha;
        this.tipo = tipo;
        this.ativo = ativo;
    }

    public String getId() { return id; }
    public String getCpf() { return cpf; }
    public String getEmail() { return email; }
    public String getSenha() { return senha; }
    public String getTipo() { return tipo; }
    public boolean isAtivo() { return ativo; }

    public void setSenha(String senha) { this.senha = senha; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
}
