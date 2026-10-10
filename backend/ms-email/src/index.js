const amqp = require('amqplib');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672';
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

const SENHA_PATH = path.join('/app', 'senha_recente.txt');

const transporter = EMAIL_USER && EMAIL_PASS
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    })
    : null;

const buildHtml = (content) => {
    const { tipo, dados } = content;

    if (tipo === 'SENHA_INICIAL' || tipo === 'SEND_WELCOME_EMAIL') {
        return `<p>Sua conta BANTADS foi aprovada!</p><p>Senha: <strong>${dados.senha}</strong></p>`;
    }
    if (tipo === 'REJEICAO') {
        return `<p>Sua solicitação foi rejeitada.</p><p>Motivo: ${dados.motivo}</p>`;
    }
    if (tipo === 'GERENTE_REMOVIDO') {
        return `<p>Informamos que seu gerente foi alterado.</p>`;
    }
    return `<pre>${JSON.stringify(dados, null, 2)}</pre>`;
};

const processEmail = async (msg, channel) => {
    if (!msg) return;

    try {
        const content = JSON.parse(msg.content.toString());
        const { destinatario, tipo, assunto, dados } = content;

        console.log(`[✉️] Email para: ${destinatario} | Tipo: ${tipo}`);

        if (dados?.senha) {
            const linha = `email: ${destinatario}\nsenha: ${dados.senha}\n---\n`;
            fs.writeFileSync(SENHA_PATH, linha, { encoding: 'utf-8' });
            console.log(`[✉️] Senha gravada em ${SENHA_PATH}: ${dados.senha}`);
        }

        if (transporter && destinatario) {
            try {
                await transporter.sendMail({
                    from: `"BANTADS" <${EMAIL_USER}>`,
                    to: destinatario,
                    subject: assunto || 'Notificação BANTADS',
                    html: buildHtml(content),
                });
                console.log(`[✉️] E-mail enviado para ${destinatario}`);
            } catch (mailErr) {
                console.error(`[✉️] Falha ao enviar e-mail SMTP:`, mailErr.message);
            }
        }

        channel.ack(msg);
    } catch (err) {
        console.error('Erro ao processar mensagem de e-mail:', err);
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

start();