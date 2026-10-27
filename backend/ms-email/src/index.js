const amqp = require('amqplib');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672';
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// O arquivo e o volume são deliberadamente preservados para os testes do grupo.
const SENHA_PATH = path.join('/app', 'senha_recente.txt');

const transporter = EMAIL_USER && EMAIL_PASS
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: EMAIL_USER, pass: EMAIL_PASS }
    })
    : null;

const textoSeguro = (valor) => String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildHtml = (content) => {
    const { tipo, dados } = content;

    if (tipo === 'SENHA_INICIAL' || tipo === 'SEND_WELCOME_EMAIL') {
        return `<p>Sua conta BANTADS foi aprovada!</p><p>Senha: <strong>${textoSeguro(dados?.senha)}</strong></p>`;
    }
    if (tipo === 'REJEICAO') {
        return `<p>Sua solicitação foi rejeitada.</p><p>Motivo: ${textoSeguro(dados?.motivo)}</p>`;
    }
    if (tipo === 'GERENTE_REMOVIDO') {
        return '<p>Informamos que seu gerente foi alterado.</p>';
    }
    return `<pre>${textoSeguro(JSON.stringify(dados, null, 2))}</pre>`;
};

const responderSaga = (channel, sagaId, tipo, erro) => {
    if (!sagaId) return;
    const resposta = { sagaId, tipo, payload: {} };
    if (erro) resposta.erro = erro;
    channel.sendToQueue('orquestrador.reply', Buffer.from(JSON.stringify(resposta)), { persistent: true });
};

const validarMensagem = ({ destinatario, tipo, dados }) => {
    if (!tipo || typeof tipo !== 'string') throw new Error('Tipo de e-mail não informado.');
    if (!destinatario || typeof destinatario !== 'string') throw new Error('Destinatário inválido.');
    if (tipo === 'SENHA_INICIAL' && !dados?.senha) throw new Error('Senha inicial não informada.');
};

const registrarSenhaParaTeste = (destinatario, senha) => {
    if (!senha) return;
    const linha = `email: ${destinatario}\nsenha: ${senha}\n---\n`;
    fs.writeFileSync(SENHA_PATH, linha, { encoding: 'utf-8', flag: 'w' });
    console.log(`[EMAIL] Senha gravada em ${SENHA_PATH}: ${senha}`);
};

const processEmail = async (msg, channel) => {
    if (!msg) return;

    let content;
    try {
        content = JSON.parse(msg.content.toString());
        const { sagaId, destinatario, tipo, assunto, dados } = content;
        validarMensagem(content);

        console.log(`[EMAIL] Email para: ${destinatario} | Tipo: ${tipo}`);
        registrarSenhaParaTeste(destinatario, dados?.senha);

        if (transporter) {
            await transporter.sendMail({
                from: `"BANTADS" <${EMAIL_USER}>`,
                to: destinatario,
                subject: assunto || 'Notificação BANTADS',
                html: buildHtml(content)
            });
            console.log(`[EMAIL] E-mail enviado para ${destinatario}`);
        } else {
            // Sem SMTP no ambiente local, considera-se processado: o conteúdo
            // continua auditável no log e a senha inicial no volume de testes.
            console.log('[EMAIL] SMTP não configurado; e-mail registrado para teste local.');
        }

        responderSaga(channel, sagaId, 'EMAIL_ENVIADO');
        channel.ack(msg);
    } catch (err) {
        console.error('Erro ao processar mensagem de e-mail:', err.message);
        responderSaga(channel, content?.sagaId, 'EMAIL_FAILED', err.message);
        channel.nack(msg, false, false);
    }
};

const start = async () => {
    try {
        const conn = await amqp.connect(RABBITMQ_URL);
        const channel = await conn.createChannel();

        for (const fila of ['ms.email.cmd', 'email.cmd']) {
            await channel.assertQueue(fila, { durable: true });
            channel.consume(fila, (msg) => processEmail(msg, channel), { noAck: false });
        }
        channel.prefetch(1);
        console.log('MS Email aguardando mensagens em ms.email.cmd e email.cmd...');
    } catch (err) {
        console.error('Falha ao conectar no RabbitMQ:', err.message);
        setTimeout(start, 5000);
    }
};

if (require.main === module) start();

module.exports = {
    buildHtml,
    processEmail,
    registrarSenhaParaTeste,
    responderSaga,
    start,
    validarMensagem
};
