package com.bantads.msgerente.service;

import com.bantads.msgerente.dto.GerenteRequest;
import com.bantads.msgerente.dto.GerenteResponse;
import com.bantads.msgerente.repository.GerenteRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class GerenteService {
    private final GerenteRepository repository;

    public GerenteService(GerenteRepository repository) { this.repository = repository; }

    public GerenteResponse porCpf(String cpf) {
        return repository.porCpf(cpf).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    public List<GerenteResponse> listar() { return repository.listarAtivos(); }

    public List<GerenteResponse> listarCpfsAtivos() { return repository.listarAtivos(); }

    public GerenteResponse inserir(GerenteRequest req) {
        if (repository.existePorCpf(req.cpf())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "CPF já cadastrado");
        }
        if (repository.existePorEmail(req.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail já cadastrado");
        }
        repository.inserir(req);
        return repository.porCpf(req.cpf()).orElseThrow();
    }

    public GerenteResponse atualizar(String cpf, String nome, String telefone) {
        if (repository.atualizar(cpf, nome, telefone) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Gerente não encontrado");
        }
        return repository.porCpf(cpf).orElseThrow();
    }

    public void desativar(String cpf) {
        if (repository.desativar(cpf) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Gerente não encontrado");
        }
    }

    public void reboot() { repository.reboot(); }
}
