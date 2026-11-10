package com.bantads.msconta.service;

import com.bantads.msconta.exception.ContaNaoPertenceException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ContaPosseGuardTest {

    private final ContaPosseGuard guard = new ContaPosseGuard();

    @Test
    void deveIgnorarValidacaoQuandoTipoNaoECliente() {
        assertDoesNotThrow(() -> guard.garantirAcessoConta("12912861012", "outro", "GERENTE"));
        assertDoesNotThrow(() -> guard.garantirAcessoConta("12912861012", null, null));
    }

    @Test
    void deveAceitarQuandoClienteConsultaAPropriaConta() {
        assertDoesNotThrow(() -> guard.garantirAcessoConta("12912861012", "12912861012", "CLIENTE"));
        assertDoesNotThrow(() -> guard.garantirAcessoPorCpfConsultado("12912861012", "12912861012", "cliente"));
    }

    @Test
    void deveRecusarQuandoClienteConsultaContaDeOutro() {
        assertThrows(
                ContaNaoPertenceException.class,
                () -> guard.garantirAcessoConta("12912861012", "09506382000", "CLIENTE")
        );
        assertThrows(
                ContaNaoPertenceException.class,
                () -> guard.garantirAcessoPorCpfConsultado("12912861012", "09506382000", "CLIENTE")
        );
    }

    @Test
    void deveIdentificarTipoUsuario() {
        assertTrue(guard.ehCliente("CLIENTE"));
        assertTrue(guard.ehCliente("cliente"));
        assertFalse(guard.ehCliente("GERENTE"));
        assertTrue(guard.ehGerente("GERENTE"));
        assertFalse(guard.ehGerente(null));
    }
}
