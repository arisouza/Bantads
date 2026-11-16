// Senhas transitórias não podem ser persistidas no estado da SAGA.
// Elas permanecem somente na memória do processo até o passo de e-mail.
const valores = new Map();

module.exports = {
    guardar: async (sagaId, senha) => {
        if (senha) valores.set(sagaId, senha);
    },
    obter: async (sagaId) => valores.get(sagaId) ?? null,
    descartar: async (sagaId) => valores.delete(sagaId)
};
