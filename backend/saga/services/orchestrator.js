const { updateJob } = require('../config/redis');
const { getChannel } = require('../config/rabbitmq');

const orchestrate = async (command) => {
    const channel = getChannel();
    const { sagaId, action, data, erro } = command;

    try {
        switch (action) {
            case 'APROVAR_CLIENTE_START':
                await updateJob(sagaId, 'PENDENTE', { resultType: 'resource', dominio: 'clientes' });
                channel.sendToQueue('cliente.cmd', Buffer.from(JSON.stringify({ sagaId, action: 'CREATE_CLIENTE', data })));
                break;
            case 'CLIENTE_CREATED':
                channel.sendToQueue('auth.cmd', Buffer.from(JSON.stringify({ sagaId, action: 'CREATE_AUTH', data })));
                break;
            case 'AUTH_CREATED':
                channel.sendToQueue('ms.conta.cmd', Buffer.from(JSON.stringify({
                                                         sagaId,
                                                         tipo: 'CREATE_CONTA',
                                                         timestamp: new Date().toISOString(),
                                                         payload: data
                                                     }));
                break;
            case 'CONTA_CREATED':
                channel.sendToQueue('email.cmd', Buffer.from(JSON.stringify({ sagaId, action: 'SEND_WELCOME_EMAIL', data })));
                await updateJob(sagaId, 'CONCLUIDO', { resourceId: data.cpfCliente });
                break;
            case 'AUTH_FAILED':
            case 'CONTA_FAILED':
                channel.sendToQueue('cliente.cmd', Buffer.from(JSON.stringify({ sagaId, action: 'ROLLBACK_CLIENTE', data })));
                await updateJob(sagaId, 'FALHA', { erro: erro || 'Falha na validacao das regras de negocio.' });
                break;
            case 'CLIENTE_ROLLBACK_DONE':
                console.log(`Rollback finalizado para APROVAR_CLIENTE SAGA ${sagaId}`);
                break;
            case 'INSERIR_GERENTE_START':
                await updateJob(sagaId, 'PENDENTE', { resultType: 'resource', dominio: 'gerentes' });
                channel.sendToQueue('gerente.cmd', Buffer.from(JSON.stringify({ sagaId, action: 'CREATE_GERENTE', data })));
                break;
            case 'GERENTE_CREATED':
                channel.sendToQueue('auth.cmd', Buffer.from(JSON.stringify({ sagaId, action: 'CREATE_AUTH_GERENTE', data })));
                break;
            case 'AUTH_GERENTE_CREATED':
                await updateJob(sagaId, 'CONCLUIDO', { resourceId: data.cpf });
                break;
            case 'AUTH_GERENTE_FAILED':
                channel.sendToQueue('gerente.cmd', Buffer.from(JSON.stringify({ sagaId, action: 'ROLLBACK_GERENTE', data })));
                await updateJob(sagaId, 'FALHA', { erro: erro || 'Falha ao criar acesso do gerente.' });
                break;
            case 'GERENTE_ROLLBACK_DONE':
                console.log(`Rollback finalizado para INSERIR_GERENTE SAGA ${sagaId}`);
                break;
            case 'REMOVER_GERENTE_START':
                await updateJob(sagaId, 'PENDENTE', { resultType: 'inline' });
                channel.sendToQueue('gerente.cmd', Buffer.from(JSON.stringify({ sagaId, action: 'INACTIVATE_GERENTE', data })));
                break;
            case 'GERENTE_INACTIVATED':
                channel.sendToQueue('auth.cmd', Buffer.from(JSON.stringify({ sagaId, action: 'REVOKE_AUTH_GERENTE', data })));
                break;
            case 'AUTH_GERENTE_REVOKED':
                channel.sendToQueue('conta.cmd', Buffer.from(JSON.stringify({ sagaId, action: 'TRANSFER_CONTAS_GERENTE', data })));
                break;
            case 'CONTAS_GERENTE_TRANSFERRED':
                await updateJob(sagaId, 'CONCLUIDO', { mensagem: `Contas transferidas para ${data.novoGerenteNome || 'novo gerente'}` });
                break;
            case 'GERENTE_INACTIVATE_FAILED':
            case 'TRANSFER_CONTAS_FAILED':
                await updateJob(sagaId, 'FALHA', { erro: erro || 'Falha na remocao do gerente.' });
                break;
        }
    } catch (err) {
        console.error(`Falha critica no orquestrador para a SAGA ${sagaId}:`, err);
        await updateJob(sagaId, 'FALHA', { erro: 'Erro interno no processamento da SAGA.' });
    }
};

module.exports = {
    orchestrate
};