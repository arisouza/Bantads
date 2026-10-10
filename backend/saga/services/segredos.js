const senhas = new Map();

module.exports = {
    guardar: (sagaId, senha) => senha && senhas.set(sagaId, senha),
    obter: (sagaId) => senhas.get(sagaId),
    descartar: (sagaId) => senhas.delete(sagaId)
};
