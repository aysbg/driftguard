import express from 'express';

const app = express();

app.get('/users', (_req, res) => {
  res.json([]);
});

app.post('/orders', (_req, res) => {
  res.status(201).json({ ok: true });
});

app.get('/admin/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
