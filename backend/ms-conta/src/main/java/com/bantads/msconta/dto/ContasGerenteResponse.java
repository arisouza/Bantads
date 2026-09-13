package com.bantads.msconta.dto;

import org.springframework.hateoas.RepresentationModel;

import java.util.ArrayList;
import java.util.List;

public class ContasGerenteResponse extends RepresentationModel<ContasGerenteResponse> {

    private String cpfGerente;
    private int quantidadeClientes;
    private List<ContaResponse> contas = new ArrayList<>();

    public ContasGerenteResponse() {
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

    public List<ContaResponse> getContas() {
        return contas;
    }

    public void setContas(List<ContaResponse> contas) {
        this.contas = contas;
    }
}
