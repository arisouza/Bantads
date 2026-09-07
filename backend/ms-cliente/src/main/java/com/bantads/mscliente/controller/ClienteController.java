package com.bantads.mscliente.controller;

import com.bantads.mscliente.dto.ClienteResponse;
import com.bantads.mscliente.service.ClienteService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/clientes")
public class ClienteController {
    private final ClienteService service;

    public ClienteController(ClienteService service) { this.service = service; }

    @GetMapping("/{cpf}")
    public ClienteResponse porCpf(@PathVariable String cpf) { return service.porCpf(cpf); }
}
