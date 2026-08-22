db = db.getSiblingDB('bantads_auth');

db.createCollection('usuarios');
db.usuarios.createIndex({ "email": 1 }, { unique: true });

// senha 'tads'
const hashSenhaTads = "$argon2id$v=19$m=16384,t=2,p=1$c2FsdHNhbHRzYWx0$LqV9aQZJ1Z2W8+tE3Z+iX/T2z3B7lQoXmJ4hXjD7wYk";

db.usuarios.insertMany([

  // Clientes

  { 
    cpf: "12912861012", 
    email: "cli1@bantads.com.br", 
    senha: hashSenhaTads, 
    tipo: "CLIENTE", 
    ativo: true 
  },
  { 
    cpf: "09506382000", 
    email: "cli2@bantads.com.br", 
    senha: hashSenhaTads, 
    tipo: "CLIENTE", 
    ativo: true 
  },
  { 
    cpf: "85733854057", 
    email: "cli3@bantads.com.br", 
    senha: hashSenhaTads, 
    tipo: "CLIENTE", 
    ativo: true 
  },
  { 
    cpf: "58872160006", 
    email: "cli4@bantads.com.br", 
    senha: hashSenhaTads, 
    tipo: "CLIENTE", 
    ativo: true 
  },
  { 
    cpf: "76179646090", 
    email: "cli5@bantads.com.br", 
    senha: hashSenhaTads, 
    tipo: "CLIENTE", 
    ativo: true 
  },

  // Gerentes

  { 
    cpf: "98574307084", 
    email: "ger1@bantads.com.br", 
    senha: hashSenhaTads, 
    tipo: "GERENTE", 
    ativo: true 
  },
  { 
    cpf: "64065268052", 
    email: "ger2@bantads.com.br", 
    senha: hashSenhaTads, 
    tipo: "GERENTE", 
    ativo: true 
  },
  { 
    cpf: "23862179060", 
    email: "ger3@bantads.com.br", 
    senha: hashSenhaTads, 
    tipo: "GERENTE", 
    ativo: true 
  },
  { 
    cpf: "40501740066", 
    email: "ger4@bantads.com.br", 
    senha: hashSenhaTads, 
    tipo: "GERENTE", 
    ativo: true 
  }
]);

print(">> seed auth finalizado");