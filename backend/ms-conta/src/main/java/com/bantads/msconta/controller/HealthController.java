package com.bantads.msconta.controller;

import com.bantads.msconta.service.ContaQueryService;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class HealthController {

    private final ContaQueryService contaQueryService;
    private final DataSource dataSource;

    public HealthController(ContaQueryService contaQueryService, DataSource dataSource) {
        this.contaQueryService = contaQueryService;
        this.dataSource = dataSource;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("status", "ok");
        body.put("service", "ms-conta");
        return ResponseEntity.ok(body);
    }

    @PostMapping({"/reboot", "/contas/reboot"})
    public ResponseEntity<Map<String, Object>> reboot() {
        try {
            ClassPathResource resource = new ClassPathResource("seed.sql");
            if (resource.exists()) {
                ResourceDatabasePopulator populator = new ResourceDatabasePopulator(resource);
                populator.execute(dataSource);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "ok");
        body.put("contas", contaQueryService.contarContas());
        return ResponseEntity.ok(body);
    }
}
