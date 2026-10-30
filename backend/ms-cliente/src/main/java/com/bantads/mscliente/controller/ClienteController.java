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
        return Map.of(
                "clientes", service.listar(busca),
                "_links", Map.of("self", Map.of("href", "/clientes"))
        );
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> solicitar(@Valid @RequestBody SolicitacaoRequest solicitacao) {
        service.solicitar(solicitacao);
        String base = "/clientes/solicitacoes/" + solicitacao.cpf();
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "mensagem", "Solicitação enviada para análise",
                "_links", Map.of(
                        "self", Map.of("href", base),
                        "aprovacao", Map.of("href", base + "/aprovacao"),
                        "rejeicao", Map.of("href", base + "/rejeicao")
                )
        ));
    }

    @GetMapping("/solicitacoes")
    public Map<String, Object> listarSolicitacoes(@RequestParam(required = false) String status) {
        return Map.of(
                "solicitacoes", service.listarSolicitacoes(status),
                "_links", Map.of("self", Map.of("href", "/clientes/solicitacoes"))
        );
    }

    @GetMapping("/solicitacoes/{cpf}")
    public SolicitacaoResponse solicitacao(@PathVariable String cpf) { return service.solicitacaoPorCpf(cpf); }

    @PostMapping("/solicitacoes/{cpf}/rejeicao")
    public ResponseEntity<SolicitacaoResponse> rejeitar(@PathVariable String cpf, @Valid @RequestBody RejeicaoRequest request) {
        return ResponseEntity.ok(service.rejeitar(cpf, request.motivo()));
    }

    @PostMapping("/reboot")
    public Map<String, Object> reboot() {
        service.reboot();
        return Map.of("status", "ok", "clientes", 5);
    }
}
