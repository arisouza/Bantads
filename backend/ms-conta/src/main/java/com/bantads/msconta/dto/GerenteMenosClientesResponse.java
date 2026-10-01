package com.bantads.msconta.dto;

import org.springframework.hateoas.RepresentationModel;

public class GerenteMenosClientesResponse extends RepresentationModel<GerenteMenosClientesResponse> {

    private String cpfGerente;
    private int quantidadeClientes;

    public GerenteMenosClientesResponse() {
    }

    public GerenteMenosClientesResponse(String cpfGerente, int quantidadeClientes) {
        this.cpfGerente = cpfGerente;
        this.quantidadeClientes = quantidadeClientes;
    }

    public String getCpfGerente() {
        return cpfGerente;
    }

    public void setCpfGerente(String cpfGerente) {
        this.cpfGerente = cpfGerente;
    }

    public int getQuantidadeClientes() {
        return quantidadeClientes;
    }

    public void setQuantidadeClientes(int quantidadeClientes) {
        this.quantidadeClientes = quantidadeClientes;
    }
}
