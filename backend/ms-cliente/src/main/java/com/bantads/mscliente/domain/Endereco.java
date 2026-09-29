package com.bantads.mscliente.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class Endereco {
    @Column(nullable = false) private String logradouro;
    @Column(nullable = false) private String numero;
    private String complemento;
    @Column(nullable = false, length = 8) private String cep;
    @Column(nullable = false) private String cidade;
    @Column(nullable = false, length = 2) private String uf;
    protected Endereco() {}
    public Endereco(String logradouro, String numero, String complemento, String cep, String cidade, String uf) { this.logradouro = logradouro; this.numero = numero; this.complemento = complemento; this.cep = cep; this.cidade = cidade; this.uf = uf; }
    public String getLogradouro() { return logradouro; } public String getNumero() { return numero; } public String getComplemento() { return complemento; } public String getCep() { return cep; } public String getCidade() { return cidade; } public String getUf() { return uf; }
}
