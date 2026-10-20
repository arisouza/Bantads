const { getChannel } = require('../config/rabbitmq');

const publicar = (fila, mensagem) =>
    getChannel().sendToQueue(fila, Buffer.from(JSON.stringify(mensagem)), { persistent: true });

const comandoSimples = (fila) => (sagaId, action, data) => publicar(fila, { sagaId, action, data });

module.exports = {
    cliente: comandoSimples('ms.cliente.cmd'),
    gerente: comandoSimples('ms.gerente.cmd'),
    auth: comandoSimples('ms.auth.cmd'),
    conta: (sagaId, tipo, payload) =>
        publicar('ms.conta.cmd', { sagaId, tipo, timestamp: new Date().toISOString(), payload }),
    email: (...args) => {
        const [primeiro, segundo, terceiro, quarto, quinto] = args;
        const comSaga = args.length === 5;
        const [sagaId, destinatario, tipo, assunto, dados] = comSaga
            ? [primeiro, segundo, terceiro, quarto, quinto]
            : [null, primeiro, segundo, terceiro, quarto];
        return publicar('ms.email.cmd', { sagaId, destinatario, tipo, assunto, dados });
    }
};
