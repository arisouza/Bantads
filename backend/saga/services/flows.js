const { redisClient } = require('../config/redis');
const msg = require('./messaging');
const q = require('./queries');
const segredos = require('./segredos');

const motivoEmailDuplicado = (erro) => (/cadastrad|duplic/i.test(erro ?? '') ? 'E-mail já cadastrado' : null);

const encerrarSessao = async (cpf) => {
    const jti = await redisClient.get(`sessao:cpf:${cpf}`);
    if (jti) await redisClient.del(`sessao:${jti}`);
    await redisClient.del(`sessao:cpf:${cpf}`);
};

const aprovarCliente = {
    job: { resultType: 'resource', dominio: 'clientes' },
    cache: (ctx) => [`cache:cliente:${ctx.cpf}`],
    resultado: (ctx) => ({ resourceId: ctx.cpf }),
    aoFalhar: (ctx) => ctx.email && msg.email(
        ctx.email, 'SOLICITACAO_NAO_EFETUADA', 'Sua solicitação de conta não foi efetuada', { nome: ctx.nome }
    ),
    passos: [
        {
            nome: 'cliente',
            sucesso: 'CLIENTE_CREATED',
            falha: 'CLIENTE_FAILED',
            executar: (ctx, id) => msg.cliente(id, 'CREATE_CLIENTE', { cpf: ctx.cpf }),
            aplicar: (ctx, payload) => Object.assign(ctx, { nome: payload.nome, email: payload.email }),
            desfazer: (ctx, id, erro) =>
                msg.cliente(id, 'ROLLBACK_CLIENTE', { cpf: ctx.cpf, motivo: motivoEmailDuplicado(erro) })
        },
        {
            nome: 'gerentes',
            executar: async (ctx) => {
                ctx.cpfsGerentesAtivos = await q.gerentesAtivos();
                if (ctx.cpfsGerentesAtivos.length === 0) throw new Error('Não há gerente ativo para receber a conta.');
                return true;
            }
        },
        {
            nome: 'auth',
            sucesso: 'AUTH_CREATED',
            falha: 'AUTH_FAILED',
            executar: (ctx, id) => msg.auth(id, 'CREATE_AUTH', { cpf: ctx.cpf, email: ctx.email }),
            aplicar: (ctx, payload, id) => segredos.guardar(id, payload.senha),
            desfazer: (ctx, id) => msg.auth(id, 'ROLLBACK_AUTH', { cpf: ctx.cpf })
        },
        {
            nome: 'conta',
            sucesso: 'CONTA_CREATED',
            falha: 'CONTA_FAILED',
            executar: (ctx, id) => msg.conta(id, 'CREATE_CONTA', {
                cpfCliente: ctx.cpf,
                cpfsGerentesAtivos: ctx.cpfsGerentesAtivos
            }),
            aplicar: (ctx, payload) => Object.assign(ctx, { numeroConta: payload.numeroConta })
        },
        {
            nome: 'email',
            executar: async (ctx, id) => {
                msg.email(ctx.email, 'SENHA_INICIAL', 'Sua conta BANTADS foi criada!', {
                    senha: segredos.obter(id),
                    cpf: ctx.cpf
                });
                await new Promise((resolve) => setTimeout(resolve, 250));
                return true;
            }
        }
    ]
};

const inserirGerente = {
    job: { resultType: 'resource', dominio: 'gerentes' },
    cache: (ctx) => [`cache:gerente:${ctx.cpf}`],
    resultado: (ctx) => ({ resourceId: ctx.cpf }),
    passos: [
        {
            nome: 'gerente',
            sucesso: 'GERENTE_CREATED',
            falha: 'GERENTE_FAILED',
            executar: (ctx, id) => msg.gerente(id, 'CREATE_GERENTE', {
                cpf: ctx.cpf, nome: ctx.nome, email: ctx.email, telefone: ctx.telefone
            }),
            desfazer: (ctx, id) => msg.gerente(id, 'ROLLBACK_GERENTE', { cpf: ctx.cpf })
        },
        {
            nome: 'auth',
            sucesso: 'AUTH_GERENTE_CREATED',
            falha: 'AUTH_GERENTE_FAILED',
            executar: (ctx, id) => msg.auth(id, 'CREATE_AUTH_GERENTE', {
                cpf: ctx.cpf, email: ctx.email, senha: segredos.obter(id)
            }),
            desfazer: (ctx, id) => msg.auth(id, 'ROLLBACK_AUTH', { cpf: ctx.cpf })
        },
        {
            nome: 'selecao',
            executar: async (ctx) => {
                Object.assign(ctx, await q.contaParaNovoGerente(ctx.cpf));
                return true;
            }
        },
        {
            nome: 'atribuicao',
            pular: (ctx) => !ctx.numeroConta,
            sucesso: 'GERENTE_ALTERADO',
            falha: 'CONTA_FAILED',
            executar: (ctx, id) => msg.conta(id, 'ALTERAR_GERENTE', {
                numeroConta: ctx.numeroConta, cpfGerenteNovo: ctx.cpf
            }),
            desfazer: (ctx, id) => msg.conta(id, 'REASSOCIAR_CONTAS', {
                cpfGerenteDestino: ctx.cpfGerenteOriginal, numerosConta: [ctx.numeroConta]
            })
        },
        {
            nome: 'cliente',
            pular: (ctx) => !ctx.numeroConta,
            executar: async (ctx) => {
                const { nome, email } = await q.cliente(ctx.cpfClienteConta);
                Object.assign(ctx, { nomeCliente: nome, emailCliente: email });
                return true;
            }
        },
        {
            nome: 'email',
            pular: (ctx) => !ctx.numeroConta,
            executar: (ctx) => {
                msg.email(ctx.emailCliente, 'GERENTE_ALTERADO', 'Você tem um novo gerente', {
                    nome: ctx.nomeCliente, gerente: ctx.nome
                });
                return true;
            }
        }
    ]
};

const removerGerente = {
    job: { resultType: 'inline' },
    cache: (ctx) => [`cache:gerente:${ctx.cpf}`],
    resultado: (ctx) => ({
        resultado: { mensagem: 'Gerente removido e contas transferidas.', quantidadeContas: ctx.contas.length }
    }),
    passos: [
        {
            nome: 'validacao',
            executar: async (ctx) => {
                const ativos = await q.gerentesAtivos();
                if (!ativos.includes(ctx.cpf)) throw new Error('Gerente não encontrado ou já inativo.');

                ctx.cpfsGerentesAtivos = ativos.filter((cpf) => cpf !== ctx.cpf);
                if (ctx.cpfsGerentesAtivos.length === 0) throw new Error('Não é possível remover o último gerente ativo.');

                const contas = await q.contasDoGerente(ctx.cpf);
                ctx.contas = contas.map(({ numeroConta, cpfCliente }) => ({ numeroConta, cpfCliente }));
                return true;
            }
        },
        {
            nome: 'gerente',
            sucesso: 'GERENTE_INACTIVATED',
            falha: 'GERENTE_INACTIVATE_FAILED',
            executar: (ctx, id) => msg.gerente(id, 'INACTIVATE_GERENTE', { cpf: ctx.cpf }),
            desfazer: (ctx, id) => msg.gerente(id, 'REACTIVATE_GERENTE', { cpf: ctx.cpf })
        },
        {
            nome: 'auth',
            sucesso: 'AUTH_GERENTE_REVOKED',
            falha: 'AUTH_GERENTE_REVOKE_FAILED',
            executar: (ctx, id) => msg.auth(id, 'REVOKE_AUTH_GERENTE', { cpf: ctx.cpf }),
            desfazer: (ctx, id) => msg.auth(id, 'REACTIVATE_AUTH_GERENTE', { cpf: ctx.cpf })
        },
        {
            nome: 'sessao',
            executar: async (ctx) => {
                await encerrarSessao(ctx.cpf);
                return true;
            }
        },
        {
            nome: 'conta',
            pular: (ctx) => ctx.contas.length === 0,
            sucesso: 'CONTAS_GERENTE_TRANSFERIDAS',
            falha: 'CONTA_FAILED',
            executar: (ctx, id) => msg.conta(id, 'TRANSFERIR_CONTAS_GERENTE', {
                cpfGerenteRemovido: ctx.cpf, cpfsGerentesAtivos: ctx.cpfsGerentesAtivos
            }),
            desfazer: (ctx, id) => msg.conta(id, 'REASSOCIAR_CONTAS', {
                cpfGerenteDestino: ctx.cpf, numerosConta: ctx.contas.map((conta) => conta.numeroConta)
            })
        },
        {
            nome: 'clientes',
            pular: (ctx) => ctx.contas.length === 0,
            executar: async (ctx) => {
                const clientes = await Promise.all(ctx.contas.map((conta) => q.cliente(conta.cpfCliente).catch(() => null)));
                ctx.destinatarios = clientes.filter(Boolean).map(({ nome, email }) => ({ nome, email }));
                return true;
            }
        },
        {
            nome: 'email',
            pular: (ctx) => ctx.contas.length === 0,
            executar: (ctx) => {
                ctx.destinatarios.forEach(({ nome, email }) =>
                    msg.email(email, 'GERENTE_REMOVIDO', 'Seu gerente foi alterado', { nome }));
                return true;
            }
        }
    ]
};

module.exports = {
    APROVAR_CLIENTE_START: aprovarCliente,
    INSERIR_GERENTE_START: inserirGerente,
    REMOVER_GERENTE_START: removerGerente
};
