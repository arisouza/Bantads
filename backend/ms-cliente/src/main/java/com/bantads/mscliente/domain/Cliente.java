package com.bantads.mscliente.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "clientes", schema = "cliente")
public class Cliente {
    @Id @Column(length = 11) private String cpf;
    @Column(nullable = false) private String nome;
    @Column(nullable = false, unique = true) private String email;
    @Column(length = 11) private String telefone;
    @Column(precision = 19, scale = 2) private BigDecimal salario;
    @Embedded private Endereco endereco;
    protected Cliente() {}
    public Cliente(String cpf, String nome, String email, String telefone, BigDecimal salario, Endereco endereco) { this.cpf = cpf; this.nome = nome; this.email = email; this.telefone = telefone; this.salario = salario; this.endereco = endereco; }
    public String getCpf() { return cpf; } public String getNome() { return nome; } public String getEmail() { return email; } public String getTelefone() { return telefone; } public BigDecimal getSalario() { return salario; } public Endereco getEndereco() { return endereco; }
}
