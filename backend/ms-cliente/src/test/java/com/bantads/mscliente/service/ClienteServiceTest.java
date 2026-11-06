package com.bantads.mscliente.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.bantads.mscliente.domain.SolicitacaoCadastro;
import com.bantads.mscliente.domain.StatusSolicitacao;
import com.bantads.mscliente.dto.SolicitacaoRequest;
import com.bantads.mscliente.repository.ClienteRepository;
import com.bantads.mscliente.repository.ComandoProcessadoRepository;
import com.bantads.mscliente.repository.SolicitacaoRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class ClienteServiceTest {

    @Mock
    private ClienteRepository clientes;

    @Mock
    private SolicitacaoRepository solicitacoes;

    @Mock
    private ComandoProcessadoRepository comandosProcessados;

    private ClienteService service;

    @BeforeEach
    void setUp() {
        service = new ClienteService(clientes, solicitacoes, comandosProcessados);
    }

    @Test
    void rejeitarNormalizaMotivoEGravaDataDaDecisao() {
        SolicitacaoCadastro solicitacao = solicitacao();
        when(solicitacoes.findById(solicitacao.getCpf())).thenReturn(Optional.of(solicitacao));
        doAnswer(invocation -> {
            solicitacao.rejeitar(invocation.getArgument(1));
            return 1;
        }).when(solicitacoes).rejeitarSePendente(
            eq(solicitacao.getCpf()), eq("Motivo válido"), any(OffsetDateTime.class),
            eq(StatusSolicitacao.PENDENTE), eq(StatusSolicitacao.REJEITADA)
        );

        var resposta = service.rejeitar(solicitacao.getCpf(), "  Motivo válido  ");

        assertThat(resposta.status()).isEqualTo("REJEITADA");
        assertThat(resposta.motivoRejeicao()).isEqualTo("Motivo válido");
        assertThat(resposta.atualizadoEm()).isNotNull();
        verify(solicitacoes).rejeitarSePendente(
            eq(solicitacao.getCpf()), eq("Motivo válido"), any(OffsetDateTime.class),
            eq(StatusSolicitacao.PENDENTE), eq(StatusSolicitacao.REJEITADA)
        );
    }

    @Test
    void rejeitarRecusaMotivoAusenteOuEmBranco() {
        assertThatThrownBy(() -> service.rejeitar("12345678901", "  "))
            .isInstanceOfSatisfying(ResponseStatusException.class, erro ->
                assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void rejeitarRecusaSolicitacaoInexistente() {
        when(solicitacoes.findById("12345678901")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.rejeitar("12345678901", "Motivo"))
            .isInstanceOfSatisfying(ResponseStatusException.class, erro ->
                assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void rejeitarRecusaSolicitacaoJaProcessada() {
        SolicitacaoCadastro solicitacao = solicitacao();
        solicitacao.aprovar();
        when(solicitacoes.findById(solicitacao.getCpf())).thenReturn(Optional.of(solicitacao));
        when(solicitacoes.rejeitarSePendente(
            eq(solicitacao.getCpf()), eq("Motivo"), any(OffsetDateTime.class),
            eq(StatusSolicitacao.PENDENTE), eq(StatusSolicitacao.REJEITADA)
        )).thenReturn(0);

        assertThatThrownBy(() -> service.rejeitar(solicitacao.getCpf(), "Motivo"))
            .isInstanceOfSatisfying(ResponseStatusException.class, erro ->
                assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void listarSolicitacoesRetornaTodosOsEstados() {
        SolicitacaoCadastro pendente = solicitacao();
        SolicitacaoCadastro aprovada = solicitacao("12345678902");
        aprovada.aprovar();
        when(solicitacoes.findAllByOrderByCriadoEmAsc()).thenReturn(List.of(pendente, aprovada));

        var resultado = service.listarSolicitacoes();

        assertThat(resultado).hasSize(2);
        assertThat(resultado.get(0).status()).isEqualTo("PENDENTE");
        assertThat(resultado.get(1).status()).isEqualTo("APROVADA");
    }

    @Test
    void solicitarRecusaCpfOuEmailDuplicado() {
        SolicitacaoRequest req = new SolicitacaoRequest(
            "12345678901", "Cliente", "cli@bantads.com.br", "41999990000",
            new BigDecimal("2500.00"), "Rua A", "10", null, "80000000", "Curitiba", "PR"
        );
        when(clientes.existsByCpfOrEmail(req.cpf(), req.email())).thenReturn(true);

        assertThatThrownBy(() -> service.solicitar(req))
            .isInstanceOfSatisfying(ResponseStatusException.class, erro ->
                assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void rollbackClienteReabreSolicitacaoOuMarcaRejeitadaEApagaComandosNoReboot() {
        SolicitacaoCadastro solicitacao = solicitacao();
        solicitacao.aprovar();
        when(solicitacoes.findById(solicitacao.getCpf())).thenReturn(Optional.of(solicitacao));

        service.rollbackCliente(solicitacao.getCpf(), "E-mail já cadastrado");

        assertThat(solicitacao.getStatus()).isEqualTo(StatusSolicitacao.REJEITADA);
        assertThat(solicitacao.getMotivoRejeicao()).isEqualTo("E-mail já cadastrado");
        verify(clientes).deleteById(solicitacao.getCpf());

        service.reboot();
        verify(comandosProcessados).deleteAll();
    }

    private SolicitacaoCadastro solicitacao() {
        return solicitacao("12345678901");
    }

    private SolicitacaoCadastro solicitacao(String cpf) {
        return new SolicitacaoCadastro(
            cpf, "Cliente", "cliente-" + cpf + "@example.com", "41999990000",
            new BigDecimal("1500.00"), null
        );
    }
}
