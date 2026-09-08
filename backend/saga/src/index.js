const amqp = require('amqplib');
const { createClient } = require('redis');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = createClient({ url: REDIS_URL });
redisClient.on('error', (err) => console.error('Erro Redis SAGA:', err));

let channel = null;

const updateJobStatus = async (jobId, status, resultType = null, resultado = null) => {
    try {
        const jobData = await redisClient.get(`job:${jobId}`);
        if (jobData) {
            const job = JSON.parse(jobData);
            job.status = status;
            if (resultType) job.resultType = resultType;
            if (resultado) job.resultado = resultado;
            await redisClient.set(`job:${jobId}`, JSON.stringify(job), { EX: 3600 });
        }
    } catch (error) {
        console.error(`Falha ao atualizar job ${jobId}:`, error);
    }
};

const handleAprovarCliente = async (sagaId, payload) => {
    await updateJobStatus(sagaId, 'PROCESSANDO');
    
    try {
        const authPayload = {
            email: payload.email,
            senha: payload.cpf,
            tipo: 'CLIENTE',
            cpf: payload.cpf
        };

        const msAuthRes = await fetch('http://ms-auth:3001/auth/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(authPayload)
        });

        if (!msAuthRes.ok) throw new Error('Falha ao criar credenciais no MS Auth');

        const contaPayload = {
            cpf_cliente: payload.cpf,
            salario: payload.salario
        };

        const msContaRes = await fetch('http://ms-conta:3004/contas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contaPayload)
        });

        if (!msContaRes.ok) {
            await fetch(`http://ms-auth:3001/auth/${payload.cpf}`, { method: 'DELETE' });
            throw new Error('Falha ao criar conta. Rollback executado no MS Auth.');
        }

        const msClienteRes = await fetch(`http://ms-cliente:3002/clientes/${payload.cpf}/aprovar`, {
            method: 'PUT'
        });

        if (!msClienteRes.ok) {
            await fetch(`http://ms-auth:3001/auth/${payload.cpf}`, { method: 'DELETE' });
            await fetch(`http://ms-conta:3004/contas/cpf/${payload.cpf}`, { method: 'DELETE' });
            throw new Error('Falha ao aprovar cliente. Rollback total executado.');
        }

        channel.sendToQueue('email.cmd', Buffer.from(JSON.stringify({
            tipo: 'CLIENTE_APROVADO',
            destinatario: payload.email,
            assunto: 'Sua conta BANTADS foi aprovada!',
            dados: { cpf: payload.cpf, senhaTemporaria: payload.cpf }
        })));

        await updateJobStatus(sagaId, 'CONCLUIDO', 'inline', { mensagem: 'Cliente aprovado e conta criada com sucesso' });

    } catch (error) {
        await updateJobStatus(sagaId, 'FALHA', 'inline', { erro: error.message });
    }
};

const processMessage = async (msg) => {
    if (!msg) return;

    const content = JSON.parse(msg.content.toString());
    const { sagaId, tipo, payload } = content;

    try {
        switch (tipo) {
            case 'aprovar-cliente':
                await handleAprovarCliente(sagaId, payload);
                break;
            case 'inserir-gerente':
                await updateJobStatus(sagaId, 'PROCESSANDO');
                await updateJobStatus(sagaId, 'CONCLUIDO', 'inline', { mensagem: 'Gerente inserido via SAGA' });
                break;
            case 'remover-gerente':
                await updateJobStatus(sagaId, 'PROCESSANDO');
                await updateJobStatus(sagaId, 'CONCLUIDO', 'inline', { mensagem: 'Gerente removido via SAGA' });
                break;
            default:
                console.warn(`Tipo de SAGA desconhecido: ${tipo}`);
        }
        channel.ack(msg);
    } catch (error) {
        channel.nack(msg, false, false);
    }
};

const startOrchestrator = async () => {
    try {
        await redisClient.connect();
        console.log('Orquestrador conectado ao Redis.');

        const connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        
        await channel.assertQueue('saga.cmd', { durable: true });
        await channel.assertQueue('email.cmd', { durable: true });

        channel.prefetch(1);
        console.log('Orquestrador aguardando comandos SAGA...');
        
        channel.consume('saga.cmd', processMessage, { noAck: false });
    } catch (error) {
        console.error('Falha ao iniciar Orquestrador:', error);
        setTimeout(startOrchestrator, 5000);
    }
};

startOrchestrator();