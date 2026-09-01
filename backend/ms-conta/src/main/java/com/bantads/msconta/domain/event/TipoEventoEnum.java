package com.bantads.msconta.domain.event;

public enum TipoEventoEnum {

    CRIADO("Criado"),
    DEPOSITO("Depósito"),
    SAQUE("Saque"),
    TRANSFERENCIA_ORIGEM("TransferênciaOrigem"),
    TRANSFERENCIA_DESTINO("TransferênciaDestino"),
    GERENTE_ALTERADO("GerenteAlterado");

    private final String valor;

    TipoEventoEnum(String valor) {
        this.valor = valor;
    }

    public String getValor() {
        return valor;
    }

    public static TipoEventoEnum fromValor(String valor) {
        for (TipoEventoEnum tipo : values()) {
            if (tipo.valor.equals(valor) || tipo.name().equals(valor)) {
                return tipo;
            }
        }
        throw new IllegalArgumentException("Tipo de evento desconhecido: " + valor);
    }

    public boolean alteraSaldo() {
        return this == DEPOSITO
                || this == SAQUE
                || this == TRANSFERENCIA_ORIGEM
                || this == TRANSFERENCIA_DESTINO;
    }

    public boolean aumentaSaldo() {
        return this == DEPOSITO || this == TRANSFERENCIA_DESTINO;
    }
}
