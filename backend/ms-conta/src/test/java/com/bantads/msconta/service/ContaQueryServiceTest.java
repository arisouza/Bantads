package com.bantads.msconta.service;

import com.bantads.msconta.domain.entity.ContaRead;
import com.bantads.msconta.domain.entity.MovimentacaoRead;
import com.bantads.msconta.domain.event.TipoEventoEnum;
import com.bantads.msconta.dto.ContaMenorSaldoResponse;
import com.bantads.msconta.dto.ExtratoResponse;
import com.bantads.msconta.dto.GerenteMenosClientesResponse;
import com.bantads.msconta.exception.ValorInvalidoException;
import com.bantads.msconta.repository.query.ContaReadRepository;
import com.bantads.msconta.repository.query.MovimentacaoReadRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContaQueryServiceTest {

    @Mock private ContaReadRepository contaReadRepository;
    @Mock private MovimentacaoReadRepository movimentacaoReadRepository;

    private ContaQueryService service;

    @BeforeEach
    void setUp() {
        service = new ContaQueryService(contaReadRepository, movimentacaoReadRepository);
    }

    @Test
    void deveEscolherGerenteComMenosClientes() {
        when(contaReadRepository.countByCpfGerente("98574307084")).thenReturn(2L);
        when(contaReadRepository.countByCpfGerente("40501740066")).thenReturn(0L);

        GerenteMenosClientesResponse resp = service.escolherGerenteComMenosClientes(List.of("98574307084", "40501740066"));

        assertEquals("40501740066", resp.getCpfGerente());
        assertEquals(0, resp.getQuantidadeClientes());
    }

    @Test
    void deveRetornarContaDeMenorSaldoDoGerenteFormatadaComDuasCasas() {
        ContaRead menor = new ContaRead();
        menor.setNumeroConta("1291");
        menor.setCpfCliente("12912861012");
        menor.setCpfGerente("98574307084");
        menor.setSaldo(new BigDecimal("800.0000"));
        menor.setDataCriacao(OffsetDateTime.now());

        when(contaReadRepository.findByCpfGerenteOrderBySaldoAsc("98574307084")).thenReturn(List.of(menor));

        ContaMenorSaldoResponse resp = service.buscarContaMenorSaldoDoGerente("98574307084");

        assertFalse(resp.isSemConta());
        assertEquals("1291", resp.getConta().getNumeroConta());
        assertEquals("800.00", resp.getConta().getSaldo());
    }

    @Test
    void deveCalcularSaldoDeAberturaNoExtratoERecusarIntervaloMaiorQue365Dias() {
        when(contaReadRepository.existsById("1291")).thenReturn(true);

        MovimentacaoRead depAnterior = new MovimentacaoRead();
        depAnterior.setId(UUID.randomUUID());
        depAnterior.setNumeroConta("1291");
        depAnterior.setTipo(TipoEventoEnum.DEPOSITO.getValor());
        depAnterior.setValor(new BigDecimal("1000.0000"));
        depAnterior.setTimestamp(OffsetDateTime.parse("2020-01-01T10:00:00Z"));

        MovimentacaoRead saqueAnterior = new MovimentacaoRead();
        saqueAnterior.setId(UUID.randomUUID());
        saqueAnterior.setNumeroConta("1291");
        saqueAnterior.setTipo(TipoEventoEnum.SAQUE.getValor());
        saqueAnterior.setValor(new BigDecimal("200.0000"));
        saqueAnterior.setTimestamp(OffsetDateTime.parse("2020-01-02T10:00:00Z"));

        when(movimentacaoReadRepository.findByNumeroContaAndTimestampLessThanOrderByTimestampAsc(eq("1291"), any()))
                .thenReturn(List.of(depAnterior, saqueAnterior));
        when(movimentacaoReadRepository.findByNumeroContaAndTimestampGreaterThanEqualAndTimestampLessThanEqualOrderByTimestampAsc(
                eq("1291"), any(), any())).thenReturn(List.of());

        ExtratoResponse extrato = service.buscarExtrato("1291", "2020-02-01", "2020-02-28");
        assertEquals("800.00", extrato.getSaldoAbertura());
        assertEquals("800.00", extrato.getSaldoFechamento());

        assertThrows(
                ValorInvalidoException.class,
                () -> service.buscarExtrato("1291", "2020-01-01", "2022-01-01")
        );
    }

    @Test
    void deveUsarUltimos30DiasQuandoDatasNaoInformadasECalcularSaldoFechamento() {
        when(contaReadRepository.existsById("1291")).thenReturn(true);
        when(movimentacaoReadRepository.findByNumeroContaAndTimestampLessThanOrderByTimestampAsc(eq("1291"), any()))
                .thenReturn(List.of());

        MovimentacaoRead deposito = new MovimentacaoRead();
        deposito.setId(UUID.randomUUID());
        deposito.setNumeroConta("1291");
        deposito.setTipo(TipoEventoEnum.DEPOSITO.getValor());
        deposito.setValor(new BigDecimal("150.5000"));
        deposito.setTimestamp(OffsetDateTime.now());

        MovimentacaoRead saque = new MovimentacaoRead();
        saque.setId(UUID.randomUUID());
        saque.setNumeroConta("1291");
        saque.setTipo(TipoEventoEnum.SAQUE.getValor());
        saque.setValor(new BigDecimal("50.2500"));
        saque.setTimestamp(OffsetDateTime.now());

        when(movimentacaoReadRepository.findByNumeroContaAndTimestampGreaterThanEqualAndTimestampLessThanEqualOrderByTimestampAsc(
                eq("1291"), any(), any())).thenReturn(List.of(deposito, saque));

        ExtratoResponse extrato = service.buscarExtrato("1291", null, null);

        assertEquals("0.00", extrato.getSaldoAbertura());
        assertEquals("100.25", extrato.getSaldoFechamento());
        assertEquals(2, extrato.getMovimentacoes().size());
        assertFalse(extrato.getFim().isBefore(extrato.getInicio()));
    }

    @Test
    void deveRecusarExtratoComApenasUmaDataInformada() {
        when(contaReadRepository.existsById("1291")).thenReturn(true);

        assertThrows(
                ValorInvalidoException.class,
                () -> service.buscarExtrato("1291", "2020-01-01", null)
        );
        assertThrows(
                ValorInvalidoException.class,
                () -> service.buscarExtrato("1291", null, "2020-01-31")
        );
    }
}

