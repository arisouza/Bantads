package com.bantads.msconta.service;

import com.bantads.msconta.exception.ContaNaoPertenceException;
import org.springframework.stereotype.Component;

@Component
public class ContaPosseGuard {

    public void garantirAcessoConta(String cpfDonoConta, String cpfUsuario, String tipoUsuario) {
        if (!ehCliente(tipoUsuario)) {
            return;
        }
        if (cpfUsuario == null || cpfUsuario.isBlank() || !cpfUsuario.equals(cpfDonoConta)) {
            throw new ContaNaoPertenceException();
        }
    }

    public void garantirAcessoPorCpfConsultado(String cpfConsultado, String cpfUsuario, String tipoUsuario) {
        if (!ehCliente(tipoUsuario)) {
            return;
        }
        if (cpfUsuario == null || cpfUsuario.isBlank() || !cpfUsuario.equals(cpfConsultado)) {
            throw new ContaNaoPertenceException();
        }
    }

    public boolean ehCliente(String tipoUsuario) {
        return tipoUsuario != null && "CLIENTE".equalsIgnoreCase(tipoUsuario.trim());
    }

    public boolean ehGerente(String tipoUsuario) {
        return tipoUsuario != null && "GERENTE".equalsIgnoreCase(tipoUsuario.trim());
    }
}
