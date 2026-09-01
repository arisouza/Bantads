package com.bantads.msconta.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "movimentacao_read")
public class MovimentacaoRead {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Convert(converter = Char4Converter.class)
    @Column(name = "numero_conta", nullable = false, length = 4)
    private String numeroConta;

    @Column(name = "timestamp", nullable = false)
    private OffsetDateTime timestamp;

    @Column(name = "tipo", nullable = false, length = 50)
    private String tipo;

    @Column(name = "cpf_origem", length = 14)
    private String cpfOrigem;

    @Column(name = "nome_origem")
    private String nomeOrigem;

    @Column(name = "cpf_destino", length = 14)
    private String cpfDestino;

    @Column(name = "nome_destino")
    private String nomeDestino;

    @Column(name = "valor", nullable = false, precision = 19, scale = 4)
    private BigDecimal valor;

    public MovimentacaoRead() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getNumeroConta() {
        return numeroConta;
    }

    public void setNumeroConta(String numeroConta) {
        this.numeroConta = numeroConta;
    }

    public OffsetDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(OffsetDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getCpfOrigem() {
        return cpfOrigem;
    }

    public void setCpfOrigem(String cpfOrigem) {
        this.cpfOrigem = cpfOrigem;
    }

    public String getNomeOrigem() {
        return nomeOrigem;
    }

    public void setNomeOrigem(String nomeOrigem) {
        this.nomeOrigem = nomeOrigem;
    }

    public String getCpfDestino() {
        return cpfDestino;
    }

    public void setCpfDestino(String cpfDestino) {
        this.cpfDestino = cpfDestino;
    }

    public String getNomeDestino() {
        return nomeDestino;
    }

    public void setNomeDestino(String nomeDestino) {
        this.nomeDestino = nomeDestino;
    }

    public BigDecimal getValor() {
        return valor;
    }

    public void setValor(BigDecimal valor) {
        this.valor = valor;
    }
}
