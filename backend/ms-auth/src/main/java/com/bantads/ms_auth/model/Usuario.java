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

    public String getCpf() { return cpf; }
    public String getSenha() { return senha; }
    public String getTipo() { return tipo; }
    public boolean isAtivo() { return ativo; }
}
