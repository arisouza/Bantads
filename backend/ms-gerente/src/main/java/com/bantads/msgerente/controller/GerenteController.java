package com.bantads.msgerente.controller;

import com.bantads.msgerente.dto.GerenteRequest;
import com.bantads.msgerente.dto.GerenteResponse;
import com.bantads.msgerente.service.GerenteService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/gerentes")
public class GerenteController {
    private final GerenteService service;

    public GerenteController(GerenteService service) { this.service = service; }

    @GetMapping("/{cpf}")
    public GerenteResponse porCpf(@PathVariable String cpf) { return service.porCpf(cpf); }

    @GetMapping
    public Map<String, Object> listar() { return Map.of("gerentes", service.listar()); }

    @PostMapping
    public ResponseEntity<GerenteResponse> inserir(@RequestBody GerenteRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.inserir(req));
    }

    @PutMapping("/{cpf}")
    public GerenteResponse atualizar(@PathVariable String cpf, @RequestBody Map<String, String> body) {
        return service.atualizar(cpf, body.get("nome"), body.get("telefone"));
    }

    @DeleteMapping("/{cpf}")
    public ResponseEntity<Void> desativar(@PathVariable String cpf) {
        service.desativar(cpf);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reboot")
    public Map<String, Object> reboot() {
        service.reboot();
        return Map.of("status", "ok", "gerentes", 4);
    }
}
