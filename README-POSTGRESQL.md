# Agenda de Medições - PostgreSQL + Supabase

Sistema de agendamentos de medição migrado de SQLite para PostgreSQL com Supabase para deploy na Vercel.

## 🚀 Configuração Rápida

### 1. Criar Projeto Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie conta gratuita com GitHub
3. Crie novo projeto PostgreSQL
4. Aguarde a criação (2-3 minutos)

### 2. Configurar Variáveis de Ambiente
No arquivo `.env`, substitua os valores:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Database Configuration
DATABASE_URL=postgresql://postgres:[password]@db.your-project-ref.supabase.co:5432/postgres
```

**Onde encontrar:**
- **SUPABASE_URL**: Dashboard > Settings > API > Project URL
- **SUPABASE_ANON_KEY**: Dashboard > Settings > API > anon/public key  
- **SUPABASE_SERVICE_ROLE_KEY**: Dashboard > Settings > API > service_role key
- **DATABASE_URL**: Dashboard > Settings > Database > Connection string > URI

### 3. Instalar Dependências
```bash
npm install
```

### 4. Rodar Migração
```bash
node migrate.js
```

### 5. Iniciar Servidor
```bash
# Desenvolvimento
npm run dev

# Produção  
npm start
```

## 🌐 Deploy na Vercel

### 1. Preparar para Deploy
```bash
# Adicionar .env ao .gitignore
echo ".env" >> .gitignore

# Instalar Vercel CLI (opcional)
npm i -g vercel
```

### 2. Configurar Environment Variables na Vercel
No dashboard da Vercel > Settings > Environment Variables:
- `DATABASE_URL` - string de conexão do Supabase
- `NODE_ENV` - `production`

### 3. Deploy
```bash
# Via CLI
vercel

# Ou conectar repositório GitHub no dashboard Vercel
```

## 📊 Estrutura do Banco

```sql
CREATE TABLE agendamentos (
    id SERIAL PRIMARY KEY,
    nome_cliente VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    tipo_imovel VARCHAR(100) NOT NULL,
    ambiente VARCHAR(100) NOT NULL,
    loja VARCHAR(100) NOT NULL,
    data VARCHAR(20) NOT NULL,
    horario VARCHAR(10) NOT NULL,
    horario_agendamento VARCHAR(20) NOT NULL,
    cep VARCHAR(10) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    complemento TEXT,
    logradouro VARCHAR(255) NOT NULL,
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    observacao TEXT,
    status VARCHAR(20) DEFAULT 'agendado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Principais Mudanças

### SQLite → PostgreSQL
- `sqlite3` → `pg`
- `?` placeholders → `$1, $2, $3...`
- `AUTOINCREMENT` → `SERIAL`
- `TEXT` → `VARCHAR`/`TEXT`
- Callbacks → `async/await`
- `ILIKE` para case-insensitive search

### Novos Recursos
- Conexão via pool de conexões
- SSL para produção
- Variáveis de ambiente com `.env`
- Script de migração automática

## 🛠️ API Endpoints

- `GET /api/agendamentos` - Listar agendamentos
- `GET /api/agendamentos/:id` - Buscar agendamento
- `POST /api/agendamentos` - Criar agendamento
- `PUT /api/agendamentos/:id` - Atualizar agendamento
- `DELETE /api/agendamentos/:id` - Excluir agendamento
- `GET /api/dashboard/stats` - Estatísticas gerais
- `GET /api/dashboard/lojas` - Estatísticas por loja

## 💡 Vantagens do PostgreSQL + Supabase

- ✅ **Persistência real** - Dados não se perdem
- ✅ **Free tier generoso** - 500MB, 50k conexões/mês
- ✅ **Performance superior** - Índices e otimizações
- ✅ **Backup automático** - 30 dias
- ✅ **Real-time** - WebSocket updates
- ✅ **Dashboard admin** - Interface gerencial
- ✅ **Vercel ready** - Integrado nativamente

## 🚨 Importante

- **Nunca** commitar o arquivo `.env`
- **Sempre** usar environment variables em produção
- **Backup** regular dos dados (Supabase já faz isso)
- **Monitorar** uso do free tier

## 📝 Troubleshooting

### Erro de conexão
- Verifique `DATABASE_URL` no `.env`
- Confirme se o projeto Supabase está ativo
- Teste conexão com `node migrate.js`

### Deploy falha
- Verifique environment variables na Vercel
- Confirme se `pg` está em dependencies
- Check build logs no dashboard Vercel

## 📄 Licença
MIT License - Rodrigo
