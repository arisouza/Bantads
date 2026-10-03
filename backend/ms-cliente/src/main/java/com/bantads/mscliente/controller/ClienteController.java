package com.bantads.mscliente.controller;

import com.bantads.mscliente.dto.ClienteResponse;
import com.bantads.mscliente.dto.RejeicaoRequest;
import com.bantads.mscliente.dto.SolicitacaoRequest;
import com.bantads.mscliente.dto.SolicitacaoResponse;
import com.bantads.mscliente.service.ClienteService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/clientes")
public class ClienteController {
    private final ClienteService service;

    public ClienteController(ClienteService service) { this.service = service; }

    @GetMapping("/{cpf}")
    public ClienteResponse porCpf(@PathVariable String cpf) { return service.porCpf(cpf); }

    @GetMapping
    public Map<String, Object> listar(@RequestParam(required = false) String busca) {
        return Map.of("clientes", service.listar(busca));
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> solicitar(@Valid @RequestBody SolicitacaoRequest solicitacao) {
        service.solicitar(solicitacao);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("mensagem", "Solicitação enviada para análise"));
    }

    @GetMapping("/solicitacoes")
    public Map<String, Object> listarSolicitacoes() { return Map.of("solicitacoes", service.listarSolicitacoes()); }

    @GetMapping("/solicitacoes/{cpf}")
    public SolicitacaoResponse solicitacao(@PathVariable String cpf) { return service.solicitacaoPorCpf(cpf); }

    @PostMapping("/solicitacoes/{cpf}/rejeicao")
    public ResponseEntity<Void> rejeitar(@PathVariable String cpf, @Valid @RequestBody RejeicaoRequest request) {
        service.rejeitar(cpf, request.motivo());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reboot")
    public Map<String, Object> reboot() {
        service.reboot();
        return Map.of("status", "ok", "clientes", 5);
    }
}
