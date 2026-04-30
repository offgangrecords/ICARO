# 🔬 ÍCARO — Sistema de Prospecção de Clientes B2B

Sistema web para prospecção de clientes para distribuidora de produtos laboratoriais e odontológicos.  
Utiliza Google Places API para buscar estabelecimentos de saúde, com banco de dados Supabase.

---

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 18+ e npm
- Conta no [Supabase](https://supabase.com) (já configurado)
- Chave da [Google Places API](https://console.cloud.google.com)

---

## ⚙️ Configuração

### 1. Backend

```bash
cd backend
cp .env.example .env
```

Edite o `.env` e preencha:

| Variável | Onde obter |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → `service_role` |
| `GOOGLE_PLACES_API_KEY` | Google Cloud Console → APIs & Services → Credenciais |
| `N8N_WEBHOOK_URL` | (opcional) URL do seu webhook N8N |

```bash
npm install
npm run dev
```

O backend sobe em: **http://localhost:3001**

---

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

O frontend sobe em: **http://localhost:5173**

---

## 👤 Primeiro Acesso

Crie o primeiro usuário admin diretamente no **Supabase Dashboard**:

1. Acesse **supabase.com** → projeto `icaro-prospeccao`
2. Vá em **Authentication → Users → Add User**
3. Preencha email e senha
4. Execute no **SQL Editor**:

```sql
UPDATE usuarios 
SET nome = 'Seu Nome', perfil = 'gerente'
WHERE email = 'seu@email.com';
```

5. Acesse o ÍCARO com esse email e senha
6. Em **Configurações → Usuários**, crie os demais vendedores

---

## 🔑 Habilitar Google Places API

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um projeto ou selecione um existente
3. Vá em **APIs & Services → Library**
4. Ative **Places API** (legada) ou **Places API (New)**
5. Vá em **Credentials → Create Credentials → API Key**
6. Copie a chave e cole em **Configurações → API & Webhook** dentro do ÍCARO

> ⚠️ **Custo**: ~$0.032 por busca + ~$0.017 por detalhe de cada estabelecimento.  
> Para 50 resultados ≈ $0.88 por busca. Cache de 24h evita chamadas duplicadas.

---

## 🏗️ Estrutura do Projeto

```
projeto neolab/
├── frontend/                  # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx      # Tela de login
│   │   │   ├── Busca.jsx      # Busca de leads (Google Places)
│   │   │   ├── MeusLeads.jsx  # Base de leads salvos
│   │   │   └── Configuracoes.jsx  # API keys, tipos, usuários
│   │   ├── components/
│   │   │   ├── Layout.jsx     # Navbar e estrutura
│   │   │   ├── TabelaLeads.jsx    # Tabela com ordenação
│   │   │   ├── FormularioBusca.jsx  # Formulário de busca
│   │   │   └── BarraAcoes.jsx    # Exportar/Salvar/N8N
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx   # Autenticação global
│   │   └── services/
│   │       └── api.js         # Chamadas ao backend
│   └── ...
│
├── backend/                   # Node.js + Express
│   ├── routes/
│   │   ├── auth.js            # Login, logout, me
│   │   ├── busca.js           # Google Places (protegido)
│   │   ├── leads.js           # CRUD + exportação + N8N
│   │   └── configuracoes.js   # Settings + usuários
│   ├── services/
│   │   ├── googlePlaces.js    # API Google + cache em memória
│   │   ├── exportacao.js      # CSV e Excel
│   │   └── n8n.js             # Webhook N8N
│   ├── middleware/
│   │   └── auth.js            # Verificação de JWT Supabase
│   ├── database/
│   │   └── supabase.js        # Clientes Supabase (admin + anon)
│   └── index.js               # Servidor Express
│
├── docker-compose.yml         # Deploy em container
└── README.md
```

---

## 🐳 Deploy com Docker

```bash
# Na raiz do projeto, crie o .env raiz com todas as variáveis
cp backend/.env.example .env

# Build e sobe tudo
docker-compose up -d --build

# Ver logs
docker-compose logs -f
```

O app ficará disponível na porta 80.

---

## 🗄️ Banco de Dados (Supabase)

**Projeto:** `icaro-prospeccao`  
**URL:** `https://gimgsfouumsciayfkfto.supabase.co`  
**Região:** São Paulo (sa-east-1)

### Tabelas criadas:
| Tabela | Descrição |
|---|---|
| `usuarios` | Perfis dos vendedores (vinculado ao Supabase Auth) |
| `leads` | Leads prospectados e salvos |
| `buscas` | Histórico de buscas realizadas |
| `tipos_estabelecimento` | Tipos de estabelecimento configuráveis |
| `configuracoes` | Configurações do sistema (API keys, etc.) |

---

## 🔗 Fluxo de Autenticação

1. Usuário entra com email/senha no frontend
2. Frontend chama `POST /api/auth/login` no backend
3. Backend usa Supabase Auth → retorna `access_token`
4. Frontend armazena token no `localStorage`
5. Todas as chamadas ao backend enviam `Authorization: Bearer <token>`
6. Backend verifica o token com `supabase.auth.getUser(token)`
7. **A Google Places API Key NUNCA sai do backend**

---

## 📦 Payload N8N

Ao clicar em "Enviar para N8N", o backend envia um `POST` com:

```json
{
  "evento": "novos_leads_prospectados",
  "vendedor": { "id": "...", "nome": "João", "email": "joao@..." },
  "busca": { "cidade": "Maringá, PR", "tipo": "Clínica odontológica", "raio_km": 10 },
  "leads": [{ "nome": "...", "telefone": "...", "whatsapp": "55...", ... }],
  "total_leads": 30
}
```

---

## 📝 Licença

Uso interno — Neolab Distribuidora © 2026
