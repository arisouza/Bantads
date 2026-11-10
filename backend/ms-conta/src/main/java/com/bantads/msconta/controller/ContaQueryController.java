package com.bantads.msconta.controller;

import com.bantads.msconta.dto.ContaMenorSaldoResponse;
import com.bantads.msconta.dto.ContaResponse;
import com.bantads.msconta.dto.ContasGerenteResponse;
import com.bantads.msconta.dto.ExtratoResponse;
import com.bantads.msconta.dto.GerenteMenosClientesResponse;
import com.bantads.msconta.dto.SaldoResponse;
import com.bantads.msconta.service.ContaQueryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@RestController
@RequestMapping("/contas")
public class ContaQueryController {

    private final ContaQueryService contaQueryService;

    public ContaQueryController(ContaQueryService contaQueryService) {
        this.contaQueryService = contaQueryService;
    }

    @GetMapping
    public ResponseEntity<java.util.Map<String, Object>> listar() {
        List<ContaResponse> contas = contaQueryService.listarTodas();
        for (ContaResponse conta : contas) {
            adicionarLinks(conta);
        }
        return ResponseEntity.ok(java.util.Map.of(
                "contas", contas,
                "_links", java.util.Map.of("self", java.util.Map.of("href", linkTo(methodOn(ContaQueryController.class).listar()).toUri().toString()))
        ));
    }

    @GetMapping("/{numero:[0-9]{4}}")
    public ResponseEntity<ContaResponse> buscar(
            @PathVariable String numero,
            @RequestHeader(value = "X-User-CPF", required = false) String cpfUsuario,
            @RequestHeader(value = "X-User-Tipo", required = false) String tipoUsuario
    ) {
        ContaResponse response = contaQueryService.buscarPorNumero(numero, cpfUsuario, tipoUsuario);
        adicionarLinks(response);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{numero:[0-9]{4}}/saldo")
    public ResponseEntity<SaldoResponse> saldoPorNumero(
            @PathVariable String numero,
            @RequestHeader(value = "X-User-CPF", required = false) String cpfUsuario,
            @RequestHeader(value = "X-User-Tipo", required = false) String tipoUsuario
    ) {
        SaldoResponse response = contaQueryService.buscarSaldoPorNumero(numero, cpfUsuario, tipoUsuario);
        response.add(linkTo(methodOn(ContaQueryController.class).saldoPorNumero(numero, null, null)).withSelfRel());
        response.add(linkTo(methodOn(ContaQueryController.class).buscar(numero, null, null)).withRel("conta"));
        response.add(linkTo(methodOn(ContaQueryController.class).extrato(numero, null, null, null, null)).withRel("extrato"));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/cliente/{cpf}")
    public ResponseEntity<ContaResponse> buscarPorCpf(
            @PathVariable String cpf,
            @RequestHeader(value = "X-User-CPF", required = false) String cpfUsuario,
            @RequestHeader(value = "X-User-Tipo", required = false) String tipoUsuario
    ) {
        ContaResponse response = contaQueryService.buscarPorCpf(cpf, cpfUsuario, tipoUsuario);
        adicionarLinks(response);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/cliente/{cpf}/saldo")
    public ResponseEntity<SaldoResponse> saldoPorCpf(
            @PathVariable String cpf,
            @RequestHeader(value = "X-User-CPF", required = false) String cpfUsuario,
            @RequestHeader(value = "X-User-Tipo", required = false) String tipoUsuario
    ) {
        SaldoResponse response = contaQueryService.buscarSaldoPorCpf(cpf, cpfUsuario, tipoUsuario);
        response.add(linkTo(methodOn(ContaQueryController.class).saldoPorCpf(cpf, null, null)).withSelfRel());
        response.add(linkTo(methodOn(ContaQueryController.class).buscarPorCpf(cpf, null, null)).withRel("conta"));
        response.add(linkTo(methodOn(ContaQueryController.class).extrato(response.getNumeroConta(), null, null, null, null)).withRel("extrato"));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/gerente/menos-clientes")
    public ResponseEntity<GerenteMenosClientesResponse> gerenteComMenosClientes(
            @RequestParam("cpfs") String cpfs
    ) {
        List<String> lista = Arrays.stream(cpfs.split(","))
                .map(String::trim)
                .filter(cpf -> !cpf.isBlank())
                .collect(Collectors.toList());
        GerenteMenosClientesResponse response = contaQueryService.escolherGerenteComMenosClientes(lista);
        response.add(linkTo(methodOn(ContaQueryController.class).gerenteComMenosClientes(cpfs)).withSelfRel());
        response.add(linkTo(methodOn(ContaQueryController.class).buscarPorGerente(response.getCpfGerente())).withRel("contas"));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/gerente/{cpf}/menor-saldo")
    public ResponseEntity<ContaMenorSaldoResponse> contaMenorSaldo(@PathVariable String cpf) {
        ContaMenorSaldoResponse response = contaQueryService.buscarContaMenorSaldoDoGerente(cpf);
        response.add(linkTo(methodOn(ContaQueryController.class).contaMenorSaldo(cpf)).withSelfRel());
        response.add(linkTo(methodOn(ContaQueryController.class).buscarPorGerente(cpf)).withRel("contas"));
        if (response.getConta() != null) {
            adicionarLinks(response.getConta());
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/gerente/{cpf}")
    public ResponseEntity<ContasGerenteResponse> buscarPorGerente(@PathVariable String cpf) {
        ContasGerenteResponse response = contaQueryService.buscarPorGerente(cpf);
        response.add(linkTo(methodOn(ContaQueryController.class).buscarPorGerente(cpf)).withSelfRel());
        for (ContaResponse conta : response.getContas()) {
            adicionarLinks(conta);
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{numero:[0-9]{4}}/extrato")
    public ResponseEntity<ExtratoResponse> extrato(
            @PathVariable String numero,
            @RequestParam(required = false) String inicio,
            @RequestParam(required = false) String fim,
            @RequestHeader(value = "X-User-CPF", required = false) String cpfUsuario,
            @RequestHeader(value = "X-User-Tipo", required = false) String tipoUsuario
    ) {
        ExtratoResponse response = contaQueryService.buscarExtrato(numero, inicio, fim, cpfUsuario, tipoUsuario);
        response.add(linkTo(methodOn(ContaQueryController.class).extrato(numero, inicio, fim, null, null)).withSelfRel());
        response.add(linkTo(methodOn(ContaQueryController.class).buscar(numero, null, null)).withRel("conta"));
        return ResponseEntity.ok(response);
    }

    private void adicionarLinks(ContaResponse response) {
        String numero = response.getNumeroConta();
        response.add(linkTo(methodOn(ContaQueryController.class).buscar(numero, null, null)).withSelfRel());
        response.add(linkTo(methodOn(ContaQueryController.class).saldoPorNumero(numero, null, null)).withRel("saldo"));
        response.add(linkTo(methodOn(ContaCommandController.class).depositar(numero, null, null)).withRel("deposito"));
        response.add(linkTo(methodOn(ContaCommandController.class).sacar(numero, null, null)).withRel("saque"));
        response.add(linkTo(methodOn(ContaCommandController.class).transferir(numero, null, null)).withRel("transferencia"));
        response.add(linkTo(methodOn(ContaQueryController.class).extrato(numero, null, null, null, null)).withRel("extrato"));
    }
}
