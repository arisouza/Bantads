package com.bantads.msconta.controller;

import com.bantads.msconta.dto.ContaResponse;
import com.bantads.msconta.dto.ExtratoResponse;
import com.bantads.msconta.service.ContaQueryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@RestController
@RequestMapping("/contas")
public class ContaQueryController {

    private final ContaQueryService contaQueryService;

    public ContaQueryController(ContaQueryService contaQueryService) {
        this.contaQueryService = contaQueryService;
    }

    @GetMapping("/{numero:[0-9]{4}}")
    public ResponseEntity<ContaResponse> buscar(@PathVariable String numero) {
        ContaResponse response = contaQueryService.buscarPorNumero(numero);
        adicionarLinks(response);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/cliente/{cpf}")
    public ResponseEntity<ContaResponse> buscarPorCpf(@PathVariable String cpf) {
        ContaResponse response = contaQueryService.buscarPorCpf(cpf);
        adicionarLinks(response);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{numero:[0-9]{4}}/extrato")
    public ResponseEntity<ExtratoResponse> extrato(
            @PathVariable String numero,
            @RequestParam String inicio,
            @RequestParam String fim
    ) {
        ExtratoResponse response = contaQueryService.buscarExtrato(numero, inicio, fim);
        response.add(linkTo(methodOn(ContaQueryController.class).extrato(numero, inicio, fim)).withSelfRel());
        response.add(linkTo(methodOn(ContaQueryController.class).buscar(numero)).withRel("conta"));
        return ResponseEntity.ok(response);
    }

    private void adicionarLinks(ContaResponse response) {
        String numero = response.getNumeroConta();
        response.add(linkTo(methodOn(ContaQueryController.class).buscar(numero)).withSelfRel());
        response.add(linkTo(methodOn(ContaCommandController.class).depositar(numero, null, null)).withRel("deposito"));
        response.add(linkTo(methodOn(ContaCommandController.class).sacar(numero, null, null)).withRel("saque"));
        response.add(linkTo(methodOn(ContaQueryController.class).extrato(numero, null, null)).withRel("extrato"));
    }
}
