// src/routes/database.ts
// Autor Geral: Cadu Spadari - Autor Código BD: Felipe N. C. Moussa
// MySQL initialization using mysql2/promise
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// simple check for required env
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
  console.warn('Please set DB_HOST, DB_USER, DB_PASS (optional), DB_NAME in your .env');
}

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'app_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // optional: set namedPlaceholders: true if you want :name style params
});

// convenience query helper: returns rows
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await pool.query<T[]>(sql, params);
  return rows;
}

// helper to run queries that need the full result (for insertId)
export async function execute(sql: string, params: any[] = []) {
  const [result] = await pool.execute<any>(sql, params);
  return result;
}

// NEW: helper to obtain a pooled connection for transactions
export async function getConnection() {
  return pool.getConnection();
}

async function initSchema() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // USUARIO
    await conn.query(`
      CREATE TABLE IF NOT EXISTS USUARIO (
        id_usuario INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nome_usuario VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        telefone VARCHAR(50),
        senha VARCHAR(255) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // INSTITUICAO
    await conn.query(`
      CREATE TABLE IF NOT EXISTS INSTITUICAO (
        id_instituicao INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nome_instituicao VARCHAR(255) NOT NULL,
        fk_usuario_id_usuario INT UNSIGNED NOT NULL,
        CONSTRAINT fk_instituicao_usuario FOREIGN KEY (fk_usuario_id_usuario)
          REFERENCES USUARIO(id_usuario) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // CURSO
    await conn.query(`
      CREATE TABLE IF NOT EXISTS CURSO (
        id_curso INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nome_curso VARCHAR(255) NOT NULL,
        fk_instituicao_id_instituicao INT UNSIGNED NOT NULL,
        CONSTRAINT fk_curso_instituicao FOREIGN KEY (fk_instituicao_id_instituicao)
          REFERENCES INSTITUICAO(id_instituicao) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // DISCIPLINA
    await conn.query(`
      CREATE TABLE IF NOT EXISTS DISCIPLINA (
        id_disciplina INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nome_disciplina VARCHAR(255) NOT NULL,
        sigla VARCHAR(50),
        codigo VARCHAR(50),
        periodo VARCHAR(50),
        formula_calculo TEXT,
        fk_curso_id_curso INT UNSIGNED NOT NULL,
        CONSTRAINT fk_disciplina_curso FOREIGN KEY (fk_curso_id_curso)
          REFERENCES CURSO(id_curso) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // TURMA (fixed FK list)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS TURMA (
        id_turma INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nome_turma VARCHAR(255) NOT NULL,
        fk_disciplina_id_disciplina INT UNSIGNED NOT NULL,
        fk_curso_id_curso INT UNSIGNED NOT NULL,
        CONSTRAINT fk_turma_disciplina FOREIGN KEY (fk_disciplina_id_disciplina)
          REFERENCES DISCIPLINA(id_disciplina) ON DELETE RESTRICT,
        CONSTRAINT fk_turma_curso FOREIGN KEY (fk_curso_id_curso)
          REFERENCES CURSO(id_curso) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // ALUNO
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ALUNO (
        id_aluno INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nome_completo VARCHAR(255) NOT NULL,
        matricula VARCHAR(255) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // COMPONENTE_NOTA
    await conn.query(`
      CREATE TABLE IF NOT EXISTS COMPONENTE_NOTA (
        id_componente INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nome_componente VARCHAR(255) NOT NULL,
        sigla VARCHAR(50),
        descricao TEXT,
        fk_disciplina_id_disciplina INT UNSIGNED NOT NULL,
        CONSTRAINT fk_componente_disciplina FOREIGN KEY (fk_disciplina_id_disciplina)
          REFERENCES DISCIPLINA(id_disciplina) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // REGISTRO_NOTA (composite PK)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS REGISTRO_NOTA (
        valor_nota DECIMAL(6,2),
        fk_componente_nota_id_componente INT UNSIGNED,
        fk_aluno_id_aluno INT UNSIGNED,
        fk_turma_id_turma INT UNSIGNED,
        PRIMARY KEY (fk_componente_nota_id_componente, fk_aluno_id_aluno),
        CONSTRAINT fk_registro_componente FOREIGN KEY (fk_componente_nota_id_componente)
          REFERENCES COMPONENTE_NOTA(id_componente),
        CONSTRAINT fk_registro_aluno FOREIGN KEY (fk_aluno_id_aluno)
          REFERENCES ALUNO(id_aluno),
        CONSTRAINT fk_registro_turma FOREIGN KEY (fk_turma_id_turma)
          REFERENCES TURMA(id_turma)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // AUDITORIA_NOTA
    await conn.query(`
      CREATE TABLE IF NOT EXISTS AUDITORIA_NOTA (
        id_log INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        valor_antigo DECIMAL(6,2),
        valor_novo DECIMAL(6,2),
        data_hora DATETIME,
        mensagem TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // MATRICULA_TURMA (composite PK)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS MATRICULA_TURMA (
        valor_final_calculado DECIMAL(6,2),
        valor_ajustado DECIMAL(6,2),
        opcao_ajustada BOOLEAN,
        fk_turma_id_turma INT UNSIGNED,
        fk_aluno_id_aluno INT UNSIGNED,
        PRIMARY KEY (fk_turma_id_turma, fk_aluno_id_aluno),
        CONSTRAINT fk_matricula_turma_turma FOREIGN KEY (fk_turma_id_turma)
          REFERENCES TURMA(id_turma),
        CONSTRAINT fk_matricula_turma_aluno FOREIGN KEY (fk_aluno_id_aluno)
          REFERENCES ALUNO(id_aluno)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // tokens_recuperacao (kept as requested)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tokens_recuperacao (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT UNSIGNED NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expira_em DATETIME NOT NULL,
        usado TINYINT(1) DEFAULT 0,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_tokens_usuario FOREIGN KEY (usuario_id)
          REFERENCES USUARIO(id_usuario) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // commit when all created
    await conn.commit();
    console.log('MySQL schema initialized — all tables created/verified.');
  } catch (err) {
    await conn.rollback();
    console.error('Error initializing MySQL schema:', err);
    throw err;
  } finally {
    conn.release();
  }
}

// Run initialization asynchronously (non-blocking)
initSchema().catch((err) => {
  console.error('Schema initialization failed:', err);
});

export default pool;