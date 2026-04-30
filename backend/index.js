import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.js';
import buscaRoutes from './routes/busca.js';
import leadsRoutes from './routes/leads.js';
import configuracoesRoutes from './routes/configuracoes.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares globais
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});
app.use(limiter);

// Rate limit específico para buscas (custo de API)
const buscaLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10,
  message: { error: 'Limite de buscas atingido. Aguarde 1 minuto.' },
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ÍCARO API',
    version: '1.0.0',
  });
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/busca', buscaLimiter, buscaRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/configuracoes', configuracoesRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║        🔬 ÍCARO API - v1.0.0        ║
  ║   Sistema de Prospecção B2B Neolab  ║
  ╠══════════════════════════════════════╣
  ║  Servidor:  http://localhost:${PORT}    ║
  ║  Supabase:  ${process.env.SUPABASE_URL ? '✅ Conectado' : '❌ Não configurado'}         ║
  ║  G. Places: ${process.env.GOOGLE_PLACES_API_KEY ? '✅ Configurado' : '⚠️  Não configurado'}       ║
  ╚══════════════════════════════════════╝
  `);
});

export default app;
