package com.bantads.ms_auth;

import com.bantads.ms_auth.service.AuthService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class MsAuthApplication {

	public static void main(String[] args) {
		SpringApplication.run(MsAuthApplication.class, args);
	}

	@Bean
	CommandLineRunner migrarHashSeedLegado(AuthService authService) {
		return args -> {
			int migrados = authService.migrarHashesSeedLegados();
			if (migrados > 0) {
				System.out.printf("[ms-auth] %d hash(es) de seed legado migrado(s).%n", migrados);
			}
		};
	}

}
