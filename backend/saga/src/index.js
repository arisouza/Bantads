const { connectRabbitMQ } = require('./config/rabbitmq');
const { connectRedis } = require('./config/redis');
const { orchestrate } = require('./services/orchestrator');

const init = async () => {
    try {
        await connectRedis();
        const channel = await connectRabbitMQ();

        console.log('Orquestrador SAGA inicializado e consumindo filas...');

        channel.consume('saga.cmd', async (msg) => {
            if (msg) {
                const payload = JSON.parse(msg.content.toString());
                await orchestrate(payload);
                channel.ack(msg);
            }
        });

        channel.consume('orquestrador.reply', async (msg) => {
            if (msg) {
                const payload = JSON.parse(msg.content.toString());

                await orchestrate({
                    sagaId: payload.sagaId,
                    action: payload.tipo,
                    data: payload.payload,
                    erro: payload.erro
                });

                channel.ack(msg);
            }
        });
    } catch (error) {
        console.error('Falha ao inicializar o Orquestrador SAGA:', error);
        process.exit(1);
    }
};

init();