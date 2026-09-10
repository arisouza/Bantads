const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672';

const processEmail = async (msg, channel) => {
    if (!msg) return;

    try {
        const content = JSON.parse(msg.content.toString());
        
        console.log(`\n[✉️] Preparando e-mail para: ${content.destinatario}`);
        console.log(`[TIPO] ${content.tipo}`);
        console.log(`[ASSUNTO] ${content.assunto}`);
        console.log(`[DADOS] ${JSON.stringify(content.dados)}`);
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        console.log(`E-mail disparado com sucesso para ${content.destinatario}\n`);
        
        channel.ack(msg);
    } catch (error) {
        console.error('Erro crítico ao processar e-mail:', error);

        channel.nack(msg, false, false);
    }
};

const startEmailWorker = async () => {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        
        await channel.assertQueue('email.cmd', { durable: true });
        
        channel.prefetch(1);
        
        console.log('MS Email inicializado e aguardando disparos na fila email.cmd...');
        
        channel.consume('email.cmd', (msg) => processEmail(msg, channel), { noAck: false });
    } catch (error) {
        console.error('Falha ao conectar no RabbitMQ. Tentando novamente em 5 segundos...', error.message);
        setTimeout(startEmailWorker, 5000);
    }
};

startEmailWorker();