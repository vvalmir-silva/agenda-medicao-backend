# Agenda Medição - Backend Sistema de Agendamentos

Sistema completo de backend para gerenciamento de agendamentos de medição com banco de dados SQLite.

## 🚀 Funcionalidades

- **CRUD Completo**: Criar, Ler, Atualizar e Deletar agendamentos
- **Banco de Dados SQLite**: Armazenamento local 24/7
- **API RESTful**: Endpoints bem estruturados
- **Dashboard**: Estatísticas e relatórios
- **Filtros Avançados**: Por nome, endereço, status e loja
- **Paginação**: Para listas grandes de agendamentos
- **Exclusão em Lote**: Remova múltiplos agendamentos de uma vez

## 📋 Estrutura do Banco de Dados

A tabela `agendamentos` contém os seguintes campos:

- `id` - Chave primária autoincremento
- `nome_cliente` - Nome do cliente *
- `telefone` - Telefone do cliente *
- `email` - Email do cliente *
- `tipo_imovel` - Tipo de imóvel (casa/apartamento) *
- `ambiente` - Ambientes selecionados *
- `loja` - Loja responsável *
- `data` - Data do agendamento *
- `horario` - Horário do agendamento *
- `horario_agendamento` - Data/hora completos *
- `cep` - CEP do endereço *
- `numero` - Número do endereço *
- `complemento` - Complemento (opcional)
- `logradouro` - Logradouro *
- `bairro` - Bairro *
- `cidade` - Cidade *
- `observacao` - Observações (opcional)
- `status` - Status (agendado/finalizado/cancelado)
- `created_at` - Data de criação
- `updated_at` - Data de atualização

*Campos obrigatórios

## 🛠️ Instalação

1. **Instale o Node.js** (versão 14 ou superior)
   - Download: https://nodejs.org/

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Inicie o servidor**
   ```bash
   # Para desenvolvimento (com auto-restart)
   npm run dev
   
   # Para produção
   npm start
   ```

O servidor irá iniciar na porta 3000 (ou na porta definida na variável de ambiente PORT).

## 📡 Endpoints da API

### Agendamentos

| Método | Endpoint | Descrição |
|--------|----------|----------|
| GET | `/api/agendamentos` | Listar todos os agendamentos |
| GET | `/api/agendamentos/:id` | Buscar agendamento por ID |
| POST | `/api/agendamentos` | Criar novo agendamento |
| PUT | `/api/agendamentos/:id` | Atualizar agendamento |
| DELETE | `/api/agendamentos/:id` | Excluir agendamento |
| DELETE | `/api/agendamentos` | Excluir múltiplos agendamentos |

### Dashboard

| Método | Endpoint | Descrição |
|--------|----------|----------|
| GET | `/api/dashboard/stats` | Estatísticas gerais |
| GET | `/api/dashboard/lojas` | Estatísticas por loja |

### Parâmetros de Query (GET /api/agendamentos)

- `nome` - Filtrar por nome do cliente
- `endereco` - Filtrar por endereço (logradouro, bairro ou cidade)
- `status` - Filtrar por status (agendado/finalizado/cancelado)
- `loja` - Filtrar por loja
- `page` - Número da página (padrão: 1)
- `limit` - Registros por página (padrão: 10)

## 📝 Exemplos de Uso

### Criar Agendamento
```bash
curl -X POST http://localhost:3000/api/agendamentos \
  -H "Content-Type: application/json" \
  -d '{
    "nome_cliente": "João Silva",
    "telefone": "(11) 99999-9999",
    "email": "joao@email.com",
    "tipo_imovel": "casa",
    "ambiente": "sala,quartos",
    "loja": "Diana D1",
    "data": "2024-01-15",
    "horario": "14:00",
    "horario_agendamento": "2024-01-15 14:00",
    "cep": "01234-567",
    "numero": "123",
    "logradouro": "Rua das Flores",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "observacao": "Cliente solicita orçamento completo"
  }'
```

### Listar com Filtros
```bash
# Buscar por nome
curl "http://localhost:3000/api/agendamentos?nome=João"

# Buscar por status
curl "http://localhost:3000/api/agendamentos?status=agendado"

# Paginação
curl "http://localhost:3000/api/agendamentos?page=2&limit=5"
```

### Atualizar Agendamento
```bash
curl -X PUT http://localhost:3000/api/agendamentos/1 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "finalizado",
    "observacao": "Medição realizada com sucesso"
  }'
```

## 🗄️ Banco de Dados

O sistema utiliza SQLite que cria um arquivo `agendamentos.db` no diretório raiz. 

### Backup do Banco
Para fazer backup, simplesmente copie o arquivo `agendamentos.db`:

```bash
cp agendamentos.db backup_agendamentos_$(date +%Y%m%d_%H%M%S).db
```

### Consultas Diretas
Você pode consultar o banco diretamente:

```bash
sqlite3 agendamentos.db
.tables
SELECT * FROM agendamentos LIMIT 10;
```

## 🔧 Configuração

### Variáveis de Ambiente
- `PORT` - Porta do servidor (padrão: 3000)

### CORS
O servidor está configurado para aceitar requisições de qualquer origem (CORS aberto). Para produção, ajuste as configurações de segurança.

## 📱 Frontend

O frontend está servido estáticamente na raiz do servidor. Acesse `http://localhost:3000` para visualizar a interface completa.

## 🚨 Logs

O servidor gera logs no console para:
- Todas as requisições HTTP
- Erros de banco de dados
- Operações CRUD

## 🔄 Manutenção

### Reiniciar Servidor
```bash
# Se estiver usando npm run dev, o restart é automático
# Senão:
pkill -f "node server.js"
npm start
```

### Verificar Conexão
```bash
curl http://localhost:3000/api/dashboard/stats
```

## 📊 Monitoramento

Use os endpoints do dashboard para monitoramento:
- `/api/dashboard/stats` - Visão geral
- `/api/dashboard/lojas` - Performance por loja

## 🔒 Segurança

Para produção, considere:
1. Implementar autenticação JWT
2. Restringir origens CORS
3. Adicionar rate limiting
4. Implementar validação mais rigorosa
5. Usar HTTPS

## 🆘 Suporte

Em caso de problemas:

1. Verifique os logs do console
2. Confirme se o Node.js está instalado corretamente
3. Verifique se a porta 3000 está disponível
4. Reinicie o servidor

## 📝 Licença

MIT License
