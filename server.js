const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Servir arquivos estáticos do frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Conexão com o banco de dados PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Testar conexão
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados PostgreSQL.');
    console.log('Horário do servidor:', res.rows[0].now);
  }
});

// Criar tabela de agendamentos (função mantida para compatibilidade)
async function criarTabela() {
    try {
        const sql = `
            CREATE TABLE IF NOT EXISTS agendamentos (
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
            )
        `;
        
        await pool.query(sql);
        console.log('Tabela agendamentos criada ou já existe.');
    } catch (err) {
        console.error('Erro ao criar tabela:', err.message);
    }
}

// Middleware para logging de requisições
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// ROTAS DA API

// GET - Listar todos os agendamentos
app.get('/api/agendamentos', async (req, res) => {
    const { busca, nome, endereco, status, loja, page = 1, limit = 10 } = req.query;
    
    console.log('=== API RECEBENDO REQUISIÇÃO ===');
    console.log('Parâmetros recebidos:', { busca, nome, endereco, status, loja, page, limit });
    
    let sql = 'SELECT * FROM agendamentos WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    // Busca geral em múltiplos campos
    if (busca) {
        console.log('Aplicando filtro de busca geral:', busca);
        sql += ' AND (nome_cliente ILIKE $' + paramIndex + ' OR telefone ILIKE $' + (paramIndex + 1) + ' OR email ILIKE $' + (paramIndex + 2) + ' OR loja ILIKE $' + (paramIndex + 3) + ' OR logradouro ILIKE $' + (paramIndex + 4) + ' OR bairro ILIKE $' + (paramIndex + 5) + ' OR cidade ILIKE $' + (paramIndex + 6) + ' OR ambiente ILIKE $' + (paramIndex + 7) + ' OR observacao ILIKE $' + (paramIndex + 8) + ')';
        const buscaParam = `%${busca}%`;
        params.push(buscaParam, buscaParam, buscaParam, buscaParam, buscaParam, buscaParam, buscaParam, buscaParam, buscaParam);
        paramIndex += 9;
        console.log('SQL com busca:', sql);
        console.log('Parâmetros:', params);
    } else {
        // Filtros individuais (mantidos para compatibilidade)
        if (nome) {
            sql += ' AND nome_cliente ILIKE $' + paramIndex;
            params.push(`%${nome}%`);
            paramIndex++;
        }
        
        if (endereco) {
            sql += ' AND (logradouro ILIKE $' + paramIndex + ' OR bairro ILIKE $' + (paramIndex + 1) + ' OR cidade ILIKE $' + (paramIndex + 2) + ')';
            params.push(`%${endereco}%`, `%${endereco}%`, `%${endereco}%`);
            paramIndex += 3;
        }
        
        if (status) {
            sql += ' AND status = $' + paramIndex;
            params.push(status);
            paramIndex++;
        }
        
        if (loja) {
            sql += ' AND loja = $' + paramIndex;
            params.push(loja);
            paramIndex++;
        }
    }
    
    sql += ' ORDER BY created_at DESC';
    
    // Paginação
    const offset = (page - 1) * limit;
    sql += ' LIMIT $' + paramIndex + ' OFFSET $' + (paramIndex + 1);
    params.push(parseInt(limit), offset);
    
    try {
        const result = await pool.query(sql, params);
        const rows = result.rows;
        
        console.log('Registros encontrados:', rows.length);
        console.log('Primeiro registro:', rows[0]);
        
        // Contar total de registros para paginação
        let countSql = 'SELECT COUNT(*) as total FROM agendamentos WHERE 1=1';
        const countParams = [];
        let countParamIndex = 1;
        
        if (busca) {
            countSql += ' AND (nome_cliente ILIKE $' + countParamIndex + ' OR telefone ILIKE $' + (countParamIndex + 1) + ' OR email ILIKE $' + (countParamIndex + 2) + ' OR loja ILIKE $' + (countParamIndex + 3) + ' OR logradouro ILIKE $' + (countParamIndex + 4) + ' OR bairro ILIKE $' + (countParamIndex + 5) + ' OR cidade ILIKE $' + (countParamIndex + 6) + ' OR ambiente ILIKE $' + (countParamIndex + 7) + ' OR observacao ILIKE $' + (countParamIndex + 8) + ')';
            const buscaParam = `%${busca}%`;
            countParams.push(buscaParam, buscaParam, buscaParam, buscaParam, buscaParam, buscaParam, buscaParam, buscaParam, buscaParam);
        } else {
            if (nome) {
                countSql += ' AND nome_cliente ILIKE $' + countParamIndex;
                countParams.push(`%${nome}%`);
                countParamIndex++;
            }
            
            if (endereco) {
                countSql += ' AND (logradouro ILIKE $' + countParamIndex + ' OR bairro ILIKE $' + (countParamIndex + 1) + ' OR cidade ILIKE $' + (countParamIndex + 2) + ')';
                countParams.push(`%${endereco}%`, `%${endereco}%`, `%${endereco}%`);
                countParamIndex += 3;
            }
            
            if (status) {
                countSql += ' AND status = $' + countParamIndex;
                countParams.push(status);
                countParamIndex++;
            }
            
            if (loja) {
                countSql += ' AND loja = $' + countParamIndex;
                countParams.push(loja);
                countParamIndex++;
            }
        }
        
        const countResult = await pool.query(countSql, countParams);
        const total = parseInt(countResult.rows[0].total);
        
        res.json({
            data: rows,
            total: total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error('Erro ao buscar agendamentos:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET - Buscar agendamento por ID
app.get('/api/agendamentos/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query('SELECT * FROM agendamentos WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Agendamento não encontrado' });
        } else {
            res.json(result.rows[0]);
        }
    } catch (err) {
        console.error('Erro ao buscar agendamento:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST - Criar novo agendamento
app.post('/api/agendamentos', async (req, res) => {
    console.log('=== RECEBENDO REQUISIÇÃO POST ===');
    console.log('Headers:', req.headers);
    console.log('Body recebido:', req.body);
    console.log('Body tipo:', typeof req.body);
    
    const {
        nome_cliente,
        telefone,
        email,
        tipo_imovel,
        ambiente,
        loja,
        data,
        horario,
        horario_agendamento,
        cep,
        numero,
        complemento,
        logradouro,
        bairro,
        cidade,
        observacao,
        status = 'agendado'
    } = req.body;
    
    // Validação básica
    if (!nome_cliente || !telefone || !email || !tipo_imovel || !ambiente || !loja || 
        !data || !horario || !horario_agendamento || !cep || !numero || !logradouro || !bairro || !cidade) {
        console.error('Campos obrigatórios não preenchidos:', {
            nome_cliente, telefone, email, tipo_imovel, ambiente, loja,
            data, horario, horario_agendamento, cep, numero, logradouro, bairro, cidade
        });
        return res.status(400).json({ 
            error: 'Campos obrigatórios não preenchidos',
            missing_fields: {
                nome_cliente: !nome_cliente,
                telefone: !telefone,
                email: !email,
                tipo_imovel: !tipo_imovel,
                ambiente: !ambiente,
                loja: !loja,
                data: !data,
                horario: !horario,
                horario_agendamento: !horario_agendamento,
                cep: !cep,
                numero: !numero,
                logradouro: !logradouro,
                bairro: !bairro,
                cidade: !cidade
            }
        });
    }
    
    const sql = `
        INSERT INTO agendamentos (
            nome_cliente, telefone, email, tipo_imovel, ambiente, loja, 
            data, horario, horario_agendamento, cep, numero, complemento, 
            logradouro, bairro, cidade, observacao, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id
    `;
    
    const params = [
        nome_cliente, telefone, email, tipo_imovel, ambiente, loja,
        data, horario, horario_agendamento, cep, numero, complemento,
        logradouro, bairro, cidade, observacao, status
    ];
    
    try {
        const result = await pool.query(sql, params);
        res.status(201).json({
            id: result.rows[0].id,
            message: 'Agendamento criado com sucesso'
        });
    } catch (err) {
        console.error('Erro ao criar agendamento:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// PUT - Atualizar agendamento
app.put('/api/agendamentos/:id', async (req, res) => {
    const { id } = req.params;
    const {
        nome_cliente,
        telefone,
        email,
        tipo_imovel,
        ambiente,
        loja,
        data,
        horario,
        horario_agendamento,
        cep,
        numero,
        complemento,
        logradouro,
        bairro,
        cidade,
        observacao,
        status
    } = req.body;
    
    const sql = `
        UPDATE agendamentos SET
            nome_cliente = $1, telefone = $2, email = $3, tipo_imovel = $4, ambiente = $5, 
            loja = $6, data = $7, horario = $8, horario_agendamento = $9, cep = $10, 
            numero = $11, complemento = $12, logradouro = $13, bairro = $14, cidade = $15, 
            observacao = $16, status = $17, updated_at = CURRENT_TIMESTAMP
        WHERE id = $18
    `;
    
    const params = [
        nome_cliente, telefone, email, tipo_imovel, ambiente, loja,
        data, horario, horario_agendamento, cep, numero, complemento,
        logradouro, bairro, cidade, observacao, status, id
    ];
    
    try {
        const result = await pool.query(sql, params);
        
        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Agendamento não encontrado' });
        } else {
            res.json({ message: 'Agendamento atualizado com sucesso' });
        }
    } catch (err) {
        console.error('Erro ao atualizar agendamento:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// DELETE - Excluir agendamento
app.delete('/api/agendamentos/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query('DELETE FROM agendamentos WHERE id = $1', [id]);
        
        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Agendamento não encontrado' });
        } else {
            res.json({ message: 'Agendamento excluído com sucesso' });
        }
    } catch (err) {
        console.error('Erro ao excluir agendamento:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// DELETE - Excluir múltiplos agendamentos
app.delete('/api/agendamentos', async (req, res) => {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'IDs são obrigatórios' });
    }
    
    const placeholders = ids.map((_, index) => '$' + (index + 1)).join(',');
    const sql = `DELETE FROM agendamentos WHERE id IN (${placeholders})`;
    
    try {
        const result = await pool.query(sql, ids);
        res.json({ 
            message: `${result.rowCount} agendamento(s) excluído(s) com sucesso`,
            deletedCount: result.rowCount
        });
    } catch (err) {
        console.error('Erro ao excluir agendamentos:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET - Estatísticas para o dashboard
app.get('/api/dashboard/stats', async (req, res) => {
    const sql = `
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'agendado' THEN 1 END) as agendados,
            COUNT(CASE WHEN status = 'finalizado' THEN 1 END) as finalizados,
            COUNT(CASE WHEN status = 'cancelado' THEN 1 END) as cancelados
        FROM agendamentos
    `;
    
    try {
        const result = await pool.query(sql);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao buscar estatísticas:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET - Estatísticas por loja para gráficos
app.get('/api/dashboard/lojas', async (req, res) => {
    const sql = `
        SELECT 
            loja,
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'agendado' THEN 1 END) as agendados,
            COUNT(CASE WHEN status = 'finalizado' THEN 1 END) as finalizados,
            COUNT(CASE WHEN status = 'cancelado' THEN 1 END) as cancelados
        FROM agendamentos
        GROUP BY loja
        ORDER BY total DESC
    `;
    
    try {
        const result = await pool.query(sql);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar estatísticas por loja:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Tratamento de erro 404
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// Tratamento de erro geral
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// Iniciar servidor e criar tabela
app.listen(PORT, async () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse http://localhost:${PORT} para visualizar a aplicação`);
    
    // Criar tabela ao iniciar
    await criarTabela();
});

// Fechar conexão com o banco quando o processo for encerrado
process.on('SIGINT', async () => {
    console.log('\nEncerrando conexão com o banco de dados...');
    try {
        await pool.end();
        console.log('Conexão com o banco de dados fechada.');
    } catch (err) {
        console.error('Erro ao fechar conexão:', err.message);
    }
    process.exit(0);
});
