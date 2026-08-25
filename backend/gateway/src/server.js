const express = require('express');
const cors = require('cors');

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'bantads-gateway',
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway rodando em http://localhost:${PORT}`);
});