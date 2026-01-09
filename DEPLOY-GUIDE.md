# Guia de Deploy na Vercel

## Passo a Passo para Deploy do Projeto

### 1. Preparação do Repositório

#### 1.1. Inicializar Git (se ainda não tiver)
```bash
git init
git add .
git commit -m "Projeto limpo e preparado para deploy"
```

#### 1.2. Criar Repositório Remoto
- Acesse [GitHub](https://github.com) ou [GitLab](https://gitlab.com)
- Crie um novo repositório (ex: `agenda-medicao-backend`)
- Conecte o repositório local:
```bash
git remote add origin https://github.com/vvalmir-silva/agenda-medicao-backend.git
git branch -M main
git push -u origin main
```

### 2. Configuração na Vercel

#### 2.1. Importar Projeto
1. Acesse [vercel.com](https://vercel.com)
2. Faça login com sua conta GitHub/GitLab
3. Clique em "New Project"
4. Selecione o repositório `agenda-medicao-backend`
5. Clique em "Import"

#### 2.2. Configurar Build e Deploy
A Vercel detectará automaticamente que é um projeto Node.js. Verifique as configurações:

- **Framework Preset**: Other
- **Root Directory**: `./`
- **Build Command**: (deixe em branco)
- **Output Directory**: (deixe em branco)
- **Install Command**: `npm install`

### 3. Variáveis de Ambiente

#### 3.1. Configurar DATABASE_URL
1. Na página de configuração do projeto, vá para "Environment Variables"
2. Adicione as seguintes variáveis:

```
DATABASE_URL=postgresql://usuario:senha@host:porta/database
NODE_ENV=production
```

**Importante:** Use a URL do seu banco PostgreSQL (Supabase, ElephantSQL, etc.)

#### 3.2. Exemplo de DATABASE_URL
```
# Para Supabase
DATABASE_URL=postgresql://postgres:[SUA_SENHA]@db.[SEU_PROJETO].supabase.co:5432/postgres

# Para ElephantSQL
DATABASE_URL=postgresql://[USUARIO]:[SENHA]@[HOST].elephantsql.com:5432/[DATABASE]
```

### 4. Deploy

#### 4.1. Fazer o Deploy
1. Clique em "Deploy"
2. Aguarde o processo de build e deploy
3. Se tudo ocorrer bem, você receberá uma URL como: `https://agenda-medicao-backend.vercel.app`

#### 4.2. Verificar Deploy
- Acesse a URL fornecida
- Verifique se a página carrega corretamente
- Teste o formulário de agendamento

### 5. Configurações Adicionais

#### 5.1. Domínio Personalizado (Opcional)
1. Vá para "Settings" → "Domains"
2. Adicione seu domínio personalizado
3. Configure o DNS conforme instruções da Vercel

#### 5.2. Configurar HTTPS
A Vercel fornece HTTPS automaticamente para todos os projetos.

### 6. Monitoramento e Manutenção

#### 6.1. Logs
- Acesse "Logs" no dashboard da Vercel para monitorar erros
- Verifique os logs em tempo real durante o desenvolvimento

#### 6.2. Atualizações
Para fazer atualizações:
```bash
git add .
git commit -m "Descrição da atualização"
git push origin main
```
A Vercel fará o deploy automaticamente.

### 7. Solução de Problemas Comuns

#### 7.1. Erro de Conexão com Banco
- Verifique se `DATABASE_URL` está correta
- Confirme se o banco de dados permite conexões externas
- Verifique se as credenciais estão corretas

#### 7.2. Build Falhou
- Verifique os logs de erro na Vercel
- Confirme se `package.json` está correto
- Verifique se não há erros de sintaxe no código

#### 7.3. Página Não Carrega
- Verifique se `server.js` está servindo os arquivos estáticos corretamente
- Confirme se as rotas estão configuradas em `vercel.json`

### 8. Comandos Úteis

#### 8.1. Testar Localmente
```bash
npm install
npm start
```

#### 8.2. Verificar Variáveis de Ambiente
```bash
echo $DATABASE_URL
```

### 9. Estrutura Final do Projeto

```
agenda-medicao-backend/
├── .env (não enviado para o Git)
├── .env.example
├── .vercelignore
├── vercel.json
├── package.json
├── server.js
├── index.html
├── script.js
├── styles.css
├── favicon.svg
├── logotipo.png
├── README.md
└── DEPLOY-GUIDE.md
```

---

## Resumo Rápido

1. **Push para GitHub**: `git push origin main`
2. **Importar na Vercel**: Dashboard → New Project
3. **Configurar DATABASE_URL**: Environment Variables
4. **Deploy**: Clique em Deploy
5. **Testar**: Acesse a URL fornecida

Seu projeto estará no ar em menos de 5 minutos! 🚀
