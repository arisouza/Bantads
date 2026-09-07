package com.bantads.msgerente.controller;

import com.bantads.msgerente.dto.GerenteResponse;
import com.bantads.msgerente.service.GerenteService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/gerentes")
public class GerenteController {
    private final GerenteService service;

    public GerenteController(GerenteService service) { this.service = service; }

    @GetMapping("/{cpf}")
    public GerenteResponse porCpf(@PathVariable String cpf) { return service.porCpf(cpf); }

    // Minimal protected read used by R2 to verify token validity before logout.
    @GetMapping
    public java.util.Map<String, Object> listar() {
        return java.util.Map.of("gerentes", service.listar());
    }
}
