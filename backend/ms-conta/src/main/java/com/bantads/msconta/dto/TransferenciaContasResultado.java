package com.bantads.msconta.dto;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class TransferenciaContasResultado {

    private String cpfGerenteRemovido;
    private int quantidadeContas;
    private List<String> cpfsClientes = new ArrayList<>();
    private List<String> numerosContas = new ArrayList<>();
    private Map<String, String> contaParaGerente = new LinkedHashMap<>();

    public TransferenciaContasResultado() {
    }

    public String getCpfGerenteRemovido() {
        return cpfGerenteRemovido;
    }

    public void setCpfGerenteRemovido(String cpfGerenteRemovido) {
        this.cpfGerenteRemovido = cpfGerenteRemovido;
    }

    public int getQuantidadeContas() {
        return quantidadeContas;
    }

    public void setQuantidadeContas(int quantidadeContas) {
        this.quantidadeContas = quantidadeContas;
    }

    public List<String> getCpfsClientes() {
        return cpfsClientes;
    }

    public void setCpfsClientes(List<String> cpfsClientes) {
        this.cpfsClientes = cpfsClientes;
    }

    public List<String> getNumerosContas() {
        return numerosContas;
    }

    public void setNumerosContas(List<String> numerosContas) {
        this.numerosContas = numerosContas;
    }

    public Map<String, String> getContaParaGerente() {
        return contaParaGerente;
    }

    public void setContaParaGerente(Map<String, String> contaParaGerente) {
        this.contaParaGerente = contaParaGerente;
    }
}
