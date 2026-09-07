package com.bantads.msgerente.service;

import com.bantads.msgerente.dto.GerenteResponse;
import com.bantads.msgerente.repository.GerenteRepository;
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

    public java.util.List<GerenteResponse> listar() { return repository.listar(); }
}
