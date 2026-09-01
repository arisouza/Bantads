package com.bantads.msconta.controller;

import com.bantads.msconta.service.ContaQueryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class HealthController {

    private final ContaQueryService contaQueryService;

    public HealthController(ContaQueryService contaQueryService) {
        this.contaQueryService = contaQueryService;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("status", "ok");
        body.put("service", "ms-conta");
        return ResponseEntity.ok(body);
    }

    @PostMapping("/reboot")
    public ResponseEntity<Map<String, Object>> reboot() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "ok");
        body.put("contas", contaQueryService.contarContas());
        return ResponseEntity.ok(body);
    }
}
