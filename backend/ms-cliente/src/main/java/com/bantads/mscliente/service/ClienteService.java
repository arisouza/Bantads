package com.bantads.mscliente.service;

import com.bantads.mscliente.dto.ClienteResponse;
import com.bantads.mscliente.repository.ClienteRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ClienteService {
    private final ClienteRepository repository;

    public ClienteService(ClienteRepository repository) { this.repository = repository; }

    public ClienteResponse porCpf(String cpf) {
        return repository.porCpf(cpf).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
}
