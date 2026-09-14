# BANTADS

Sistema bancário distribuído com frontend Angular, API Gateway, microsserviços Spring Boot e infraestrutura Docker.

## Pré-requisitos

- Docker Engine;
- Docker Compose v2.

Verifique:

~~~bash
docker --version
docker compose version
~~~

## Subir a aplicação

Na raiz do projeto:

~~~bash
./start.sh
~~~

Para executar em segundo plano:

~~~bash
./start.sh -d
~~~

O script constrói as imagens Docker e sobe a aplicação com Docker Compose.

Também é possível executar manualmente:

~~~bash
docker compose build
docker compose up -d
~~~

## Acessos

| Recurso | Endereço |
|---|---|
| Frontend | http://localhost:4200 |
| API Gateway | http://localhost:3000 |
| Gateway health | http://localhost:3000/health |
| Frontend health | http://localhost:4200/health |
| RabbitMQ Management | http://localhost:15672 |

Os microsserviços são acessíveis apenas pela rede interna do Docker:

- ms-auth:3001;
- ms-cliente:3002;
- ms-gerente:3003;
- ms-conta:3004.

O frontend se comunica somente com o API Gateway, conforme a arquitetura do projeto.

## Frontend em desenvolvimento

Para executar o Angular fora do Docker, é necessário ter Node.js e npm instalados.

Mantenha o backend e o Gateway em execução:

~~~bash
docker compose up -d
~~~

Em outro terminal:

~~~bash
cd frontend
npm ci
npm start
~~~

O frontend continuará acessando o Gateway em http://localhost:3000.

Para gerar o build:

~~~bash
cd frontend
npm run build
~~~

## Parar e recriar o ambiente

Parar os containers sem apagar os dados:

~~~bash
docker compose down
~~~

Para remover também os volumes persistentes:

~~~bash
docker compose down -v
~~~

Depois, suba novamente o ambiente:

~~~bash
./start.sh -d
~~~

Use `down -v` somente quando quiser apagar os dados locais.

