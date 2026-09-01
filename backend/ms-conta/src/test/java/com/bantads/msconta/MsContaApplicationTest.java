package com.bantads.msconta;

import com.bantads.msconta.domain.event.TipoEventoEnum;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MsContaApplicationTest {

    @Test
    void tiposDeEventoSeguemAEspecificacao() {
        assertEquals("Criado", TipoEventoEnum.CRIADO.getValor());
        assertEquals("Depósito", TipoEventoEnum.DEPOSITO.getValor());
        assertEquals("Saque", TipoEventoEnum.SAQUE.getValor());
        assertEquals("TransferênciaOrigem", TipoEventoEnum.TRANSFERENCIA_ORIGEM.getValor());
        assertEquals("TransferênciaDestino", TipoEventoEnum.TRANSFERENCIA_DESTINO.getValor());
        assertEquals("GerenteAlterado", TipoEventoEnum.GERENTE_ALTERADO.getValor());
        assertEquals(TipoEventoEnum.DEPOSITO, TipoEventoEnum.fromValor("Depósito"));
    }
}
