const { updateJob, redisClient } = require('../config/redis');
const { getChannel } = require('../config/rabbitmq');

const GERENTE_URL = process.env.GERENTE_URL || 'http://ms-gerente:3003';

const sendToCliente = (channel, sagaId, action, data) => {
    channel.sendToQueue('cliente.cmd', Buffer.from(JSON.stringify({ sagaId, action, data })));
};

const sendToAuth = (channel, sagaId, action, data) => {
    channel.sendToQueue('auth.cmd', Buffer.from(JSON.stringify({ sagaId, action, data })));
};

const sendToGerente = (channel, sagaId, action, data) => {
    channel.sendToQueue('gerente.cmd', Buffer.from(JSON.stringify({ sagaId, action, data })));
};

const sendToConta = (channel, sagaId, tipo, payload) => {
    channel.sendToQueue('ms.conta.cmd', Buffer.from(JSON.stringify({
        sagaId,
        tipo,
        timestamp: new Date().toISOString(),
        payload,
    })));
};

const sendToEmail = (channel, data) => {
    channel.sendToQueue('email.cmd', Buffer.from(JSON.stringify(data)));
};

const getCpfsGerentesAtivos = async () => {
    try {
        const res = await fetch(`${GERENTE_URL}/gerentes`);
        if (!res.ok) return [];
        const { gerentes } = await res.json();
        return gerentes.map(g => g.cpf);
    } catch {
        return [];
    }
};

const orchestrate = async (command) => {
    const channel = getChannel();
    const { sagaId, action, data, erro } = command;

    try {
        switch (action) {
            case 'APROVAR_CLIENTE_START':
                await updateJob(sagaId, 'PENDENTE', { resultType: 'resource', dominio: 'clientes' });
                sendToCliente(channel, sagaId, 'CREATE_CLIENTE', data);
                break;

            case 'CLIENTE_CREATED': {
                const payload = data ?? {};
                sendToAuth(channel, sagaId, 'CREATE_AUTH', payload);
                break;
            }

            case 'AUTH_CREATED': {
                const payload = data ?? {};
                const cpfsGerentesAtivos = await getCpfsGerentesAtivos();
                sendToConta(channel, sagaId, 'CREATE_CONTA', {
                    cpfCliente: payload.cpf ?? payload.cpfCliente,
                    cpfsGerentesAtivos,
                });
                sendToEmail(channel, {
                    destinatario: payload.email,
                    tipo: 'SENHA_INICIAL',
                    assunto: 'Sua conta BANTADS foi criada!',
                    dados: { senha: payload.senha, cpf: payload.cpf ?? payload.cpfCliente },
                });
                break;
            }

            case 'CONTA_CREATED':
                await updateJob(sagaId, 'CONCLUIDO', { resourceId: data?.cpfCliente ?? data?.cpf });
                break;

            case 'CLIENTE_FAILED':
                await updateJob(sagaId, 'FALHA', { erro: erro || 'Falha ao criar cliente.' });
                break;

            case 'AUTH_FAILED':
                sendToCliente(channel, sagaId, 'ROLLBACK_CLIENTE', data);
                await updateJob(sagaId, 'FALHA', { erro: erro || 'Falha ao criar acesso.' });
                break;

            case 'CONTA_FAILED':
                if (data?.comandoTipo === 'TRANSFERIR_CONTAS_GERENTE') {
                    await updateJob(sagaId, 'FALHA', { erro: erro || 'Falha ao transferir as contas do gerente.' });
                    break;
                }
                sendToCliente(channel, sagaId, 'ROLLBACK_CLIENTE', { cpf: data?.cpfCliente ?? data?.cpf });
                await updateJob(sagaId, 'FALHA', { erro: erro || 'Falha ao criar conta.' });
                break;

            case 'CLIENTE_ROLLBACK_DONE':
                break;

            case 'INSERIR_GERENTE_START':
                await updateJob(sagaId, 'PENDENTE', { resultType: 'resource', dominio: 'gerentes' });
                sendToGerente(channel, sagaId, 'CREATE_GERENTE', data);
                break;

            case 'GERENTE_CREATED':
                sendToAuth(channel, sagaId, 'CREATE_AUTH_GERENTE', data);
                break;

            case 'AUTH_GERENTE_CREATED':
                await updateJob(sagaId, 'CONCLUIDO', { resourceId: data?.cpf });
                break;

            case 'GERENTE_FAILED':
                await updateJob(sagaId, 'FALHA', { erro: erro || 'Falha ao criar gerente.' });
                break;

            case 'AUTH_GERENTE_FAILED':
                sendToGerente(channel, sagaId, 'ROLLBACK_GERENTE', data);
                await updateJob(sagaId, 'FALHA', { erro: erro || 'Falha ao criar acesso do gerente.' });
                break;

            case 'GERENTE_ROLLBACK_DONE':
                break;

            case 'REMOVER_GERENTE_START':
                await updateJob(sagaId, 'PENDENTE', { resultType: 'inline' });
                {
                    const gerentesAlternativos = (await getCpfsGerentesAtivos())
                        .filter(cpf => cpf !== data?.cpf);
                    if (gerentesAlternativos.length === 0) {
                        await updateJob(sagaId, 'FALHA', { erro: 'NÃ£o Ã© possÃ­vel remover o Ãºltimo gerente ativo.' });
                        break;
                    }
                }
                sendToGerente(channel, sagaId, 'INACTIVATE_GERENTE', data);
                break;

            case 'GERENTE_INACTIVATED': {
                const cpf = data?.cpf;
                if (cpf) {
                    const jti = await redisClient.get(`sessao:cpf:${cpf}`);
                    if (jti) {
                        await redisClient.del(`sessao:${jti}`);
                        await redisClient.del(`sessao:cpf:${cpf}`);
                    }
                }
                sendToAuth(channel, sagaId, 'REVOKE_AUTH_GERENTE', data);
                break;
            }

            case 'AUTH_GERENTE_REVOKED': {
                const cpfsGerentesAtivos = await getCpfsGerentesAtivos();
                if (cpfsGerentesAtivos.length === 0) {
                    await updateJob(sagaId, 'FALHA', { erro: 'NÃ£o hÃ¡ gerente ativo para receber as contas.' });
                    break;
                }
                sendToConta(channel, sagaId, 'TRANSFERIR_CONTAS_GERENTE', {
                    cpfGerenteRemovido: data?.cpf,
                    cpfsGerentesAtivos,
                });
                break;
            }

            case 'CONTAS_GERENTE_TRANSFERIDAS':
                await updateJob(sagaId, 'CONCLUIDO', {
                    resultado: { mensagem: 'Gerente removido e contas transferidas.', quantidadeContas: data?.quantidadeContas ?? 0 }
                });
                break;

            case 'GERENTE_INACTIVATE_FAILED':
            case 'TRANSFER_CONTAS_FAILED':
                await updateJob(sagaId, 'FALHA', { erro: erro || 'Falha na remoção do gerente.' });
                break;

            default:
                console.warn(`[SAGA] Ação desconhecida: ${action} (sagaId: ${sagaId})`);
        }
    } catch (err) {
        console.error(`[SAGA] Falha crítica na SAGA ${sagaId}:`, err);
        await updateJob(sagaId, 'FALHA', { erro: 'Erro interno no processamento.' });
    }
};

module.exports = { orchestrate };
