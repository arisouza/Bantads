package com.bantads.msgerente.service;

import com.bantads.msgerente.domain.Gerente;
import com.bantads.msgerente.dto.GerenteRequest;
import com.bantads.msgerente.dto.GerenteResponse;
import com.bantads.msgerente.repository.GerenteRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class GerenteService {
    private final GerenteRepository repository;

    public GerenteService(GerenteRepository repository) { this.repository = repository; }

    public GerenteResponse porCpf(String cpf) {
        return repository.findById(cpf)
                .map(this::dto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    public List<GerenteResponse> listar() {
        return repository.findByAtivoTrueOrderByNomeAsc().stream().map(this::dto).toList();
    }

    public List<GerenteResponse> listarCpfsAtivos() {
        return listar();
    }

    @Transactional
    public GerenteResponse inserir(GerenteRequest req) {
        if (repository.existsById(req.cpf())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "CPF já cadastrado");
        }
        if (repository.existsByEmail(req.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail já cadastrado");
        }
        Gerente salvo = repository.save(new Gerente(req.cpf(), req.nome(), req.email(), req.telefone(), true));
        return dto(salvo);
    }

    @Transactional
    public GerenteResponse atualizar(String cpf, String nome, String telefone) {
        if (nome == null || nome.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nome do gerente é obrigatório");
        }
        Gerente gerente = repository.findByCpfAndAtivoTrue(cpf)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Gerente não encontrado"));
        gerente.atualizarDados(nome.trim(), telefone);
        return dto(repository.save(gerente));
    }

    @Transactional
    public void desativar(String cpf) {
        Gerente gerente = repository.findById(cpf)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Gerente não encontrado"));
        gerente.desativar();
        repository.save(gerente);
    }

    @Transactional
    public void reativar(String cpf) {
        repository.findById(cpf).ifPresent(gerente -> {
            gerente.reativar();
            repository.save(gerente);
        });
    }

    @Transactional
    public void remover(String cpf) {
        if (repository.existsById(cpf)) {
            repository.deleteById(cpf);
        }
    }

    @Transactional
    public void reboot() {
        repository.deleteAll();
        repository.saveAll(List.of(
                new Gerente("98574307084", "Geniéve", "ger1@bantads.com.br", "41988880001", true),
                new Gerente("64065268052", "Godophredo", "ger2@bantads.com.br", "41988880002", true),
                new Gerente("23862179060", "Gyândula", "ger3@bantads.com.br", "41988880003", true),
                new Gerente("40501740066", "Gadamântio", "ger4@bantads.com.br", "41988880004", true)
        ));
    }

    private GerenteResponse dto(Gerente g) {
        return new GerenteResponse(g.getCpf(), g.getNome(), g.getEmail(), g.getTelefone(), g.isAtivo());
    }
}
