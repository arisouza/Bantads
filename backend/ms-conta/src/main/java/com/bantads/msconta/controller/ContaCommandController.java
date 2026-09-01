package com.bantads.msconta.controller;

import com.bantads.msconta.dto.MensagemResponse;
import com.bantads.msconta.dto.TransferenciaRequest;
import com.bantads.msconta.dto.ValorRequest;
import com.bantads.msconta.service.ContaCommandService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/contas")
public class ContaCommandController {

    private final ContaCommandService contaCommandService;

    public ContaCommandController(ContaCommandService contaCommandService) {
        this.contaCommandService = contaCommandService;
    }

    @PostMapping("/{numero:[0-9]{4}}/deposito")
    public ResponseEntity<MensagemResponse> depositar(
            @PathVariable String numero,
            @Valid @RequestBody ValorRequest request,
            @RequestHeader("X-User-CPF") String cpfUsuario
    ) {
        contaCommandService.depositar(numero, request.getValor(), cpfUsuario);
        return ResponseEntity.ok(new MensagemResponse("Depósito registrado"));
    }

    @PostMapping("/{numero:[0-9]{4}}/saque")
    public ResponseEntity<MensagemResponse> sacar(
            @PathVariable String numero,
            @Valid @RequestBody ValorRequest request,
            @RequestHeader("X-User-CPF") String cpfUsuario
    ) {
        contaCommandService.sacar(numero, request.getValor(), cpfUsuario);
        return ResponseEntity.ok(new MensagemResponse("Saque registrado"));
    }

    @PostMapping("/{numero:[0-9]{4}}/transferencia")
    public ResponseEntity<MensagemResponse> transferir(
            @PathVariable String numero,
            @Valid @RequestBody TransferenciaRequest request,
            @RequestHeader("X-User-CPF") String cpfUsuario
    ) {
        contaCommandService.transferir(
                numero,
                request.getContaDestino(),
                request.getValor(),
                cpfUsuario,
                request.getCpfOrigem(),
                request.getNomeOrigem(),
                request.getCpfDestino(),
                request.getNomeDestino()
        );
        return ResponseEntity.ok(new MensagemResponse("Transferência registrada"));
    }
}
