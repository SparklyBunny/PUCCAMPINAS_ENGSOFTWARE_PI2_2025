// Autor Geral: Cadu Spadari - Autor Código BD: Felipe N. C. Moussa

// Express & BD
import { Router, Request, Response } from 'express';
// IMPORTANTE: agora usamos as helpers do MySQL
import { query, execute, pool } from '../database';

const router = Router();

// Listar Alunos (GET)
router.get('/', async (_req: Request, res: Response) => {
  const sql = `
    SELECT
      id_aluno AS id,
      matricula AS identificador,
      nome_completo AS nome
    FROM ALUNO
    ORDER BY nome_completo ASC
  `;

  try {
    const rows = await query(sql);
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Buscar Aluno (GET)
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const sql = `
    SELECT
      id_aluno AS id,
      matricula AS identificador,
      nome_completo AS nome
    FROM ALUNO
    WHERE id_aluno = ?
  `;

  try {
    const rows = await query<any>(sql, [id]);
    const row = rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }
    return res.json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  // ATENÇÃO: Adicionado 'turma_id' para uso na matrícula
  const { identificador, nome, turma_id } = req.body;

  // Validação: 'turma_id' é necessário para a matrícula
  if (!identificador || !nome || !turma_id) {
    return res
      .status(400)
      .json({ error: 'Campos identificador, nome e turma_id são obrigatórios.' });
  }

  try {
    // Verifica se já existe aluno com a mesma matrícula
    const checkSql = `SELECT 1 FROM ALUNO WHERE matricula = ? LIMIT 1`;
    const existing = await query<any>(checkSql, [identificador]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Identificador já cadastrado' });
    }

    // Usamos transação para inserir aluno + matrícula
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Inserir na tabela ALUNO
      const insertAlunoSql = `INSERT INTO ALUNO (matricula, nome_completo) VALUES (?, ?)`;
      const [insertResult]: any = await conn.execute(insertAlunoSql, [identificador, nome]);
      const alunoId = insertResult.insertId;

      // 2. Inserir na tabela MATRICULA_TURMA
      const insertMatriculaSql =
        'INSERT INTO MATRICULA_TURMA (fk_turma_id_turma, fk_aluno_id_aluno) VALUES (?, ?)';
      await conn.execute(insertMatriculaSql, [turma_id, alunoId]);

      await conn.commit();

      return res.status(201).json({
        id: alunoId,
        identificador,
        nome,
        message: 'Aluno cadastrado e matriculado com sucesso.',
      });
    } catch (err: any) {
      await conn.rollback();

      // Em caso de erro na matrícula, comportamento parecido com o comentário original
      console.error('Erro ao cadastrar aluno ou matricular:', err.message);
      return res
        .status(500)
        .json({ error: 'Aluno criado ou tentativa de criação, mas erro ao matricular.' });
    } finally {
      conn.release();
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao inserir aluno: ' + err.message });
  }
});

// Importa CSV (POST)
router.post('/importar', async (req: Request, res: Response) => {
  const { alunos, turma_id } = req.body ?? {};

  if (!alunos || !Array.isArray(alunos) || alunos.length === 0) {
    return res.status(400).json({
      error: 'Lista de alunos é obrigatória',
    });
  }

  const sqlAlunoCheck = `SELECT id_aluno FROM ALUNO WHERE matricula = ? LIMIT 1`;
  const sqlAlunoInsert = `INSERT INTO ALUNO (matricula, nome_completo) VALUES (?, ?)`;

  // Em MySQL não existe INSERT OR IGNORE, então:
  // - Tentamos inserir; se der ER_DUP_ENTRY, ignoramos (equivalente ao "IGNORE").
  const sqlMatriculaTurma = `
    INSERT INTO MATRICULA_TURMA (fk_turma_id_turma, fk_aluno_id_aluno)
    VALUES (?, (SELECT id_aluno FROM ALUNO WHERE matricula = ?))
  `;

  let processados = 0;
  const erros: string[] = [];

  const finalizar = () => {
    if (processados === alunos.length) {
      if (erros.length > 0) {
        return res.status(500).json({ error: 'Erros ao importar alunos', detalhes: erros });
      }
      return res.status(201).json({
        message: `${alunos.length} aluno(s) importado(s) com sucesso`,
        total: alunos.length,
      });
    }
  };

  // Como o código original era todo callback-based e concorrente,
  // vamos manter esse comportamento, mas usando async/await em loop.
  for (const aluno of alunos as { identificador: string; nome: string }[]) {
    if (!aluno.identificador || !aluno.nome) {
      erros.push(`Aluno inválido: ${JSON.stringify(aluno)}`);
      processados++;
      if (processados === alunos.length) {
        if (erros.length > 0) {
          return res.status(400).json({
            error: 'Alguns alunos são inválidos',
            detalhes: erros,
          });
        }
        return res.status(201).json({
          message: `${alunos.length} aluno(s) importado(s) com sucesso`,
          total: alunos.length,
        });
      }
      continue;
    }

    try {
      // Verifica se aluno já existe
      const row = (await query<any>(sqlAlunoCheck, [aluno.identificador]))[0];

      const continueAfterInsert = async () => {
        if (turma_id) {
          try {
            await execute(sqlMatriculaTurma, [turma_id, aluno.identificador]);
          } catch (err: any) {
            // ER_DUP_ENTRY: aluno já está nessa turma → comportar-se como INSERT OR IGNORE
            if (err.code !== 'ER_DUP_ENTRY') {
              erros.push(
                `Erro ao associar aluno ${aluno.identificador} à turma: ${err.message}`,
              );
            }
          }
        }
        processados++;
        if (processados === alunos.length) {
          if (erros.length > 0) {
            return res.status(500).json({
              error: 'Erros ao importar alunos',
              detalhes: erros,
            });
          }
          return res.status(201).json({
            message: `${alunos.length} aluno(s) importado(s) com sucesso`,
            total: alunos.length,
          });
        }
      };

      if (row && row.id_aluno) {
        await continueAfterInsert();
      } else {
        try {
          await execute(sqlAlunoInsert, [aluno.identificador, aluno.nome]);
        } catch (insertErr: any) {
          // Se for duplicidade, ignora (equivalente ao comportamento anterior)
          if (insertErr.code !== 'ER_DUP_ENTRY') {
            erros.push(
              `Erro ao inserir aluno ${aluno.identificador}: ${insertErr.message}`,
            );
          }
        }
        await continueAfterInsert();
      }
    } catch (checkErr: any) {
      erros.push(
        `Erro ao verificar aluno ${aluno.identificador}: ${checkErr.message}`,
      );
      processados++;
      if (processados === alunos.length) {
        if (erros.length > 0) {
          return res.status(500).json({
            error: 'Erros ao importar alunos',
            detalhes: erros,
          });
        }
        return res.status(201).json({
          message: `${alunos.length} aluno(s) importado(s) com sucesso`,
          total: alunos.length,
        });
      }
    }
  }
});

// Adicionar à Turma (POST)
router.post('/:turma_id/adicionar', async (req: Request, res: Response) => {
  const { turma_id } = req.params;
  const { aluno_id } = req.body ?? {};

  if (!aluno_id) {
    return res.status(400).json({ error: 'ID do aluno é obrigatório' });
  }

  const sql = `
    INSERT INTO MATRICULA_TURMA (fk_turma_id_turma, fk_aluno_id_aluno)
    VALUES (?, ?)
  `;

  try {
    await execute(sql, [turma_id, aluno_id]);
    return res.status(201).json({
      message: 'Aluno adicionado à turma com sucesso',
      turma_id: Number(turma_id),
      aluno_id: Number(aluno_id),
    });
  } catch (err: any) {
    // UNIQUE constraint → aluno já está na turma
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Aluno já está nesta turma' });
    }
    // FOREIGN KEY constraint falha
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(404).json({ error: 'Turma ou aluno não encontrado' });
    }
    return res.status(500).json({ error: err.message });
  }
});

// Atualiza Aluno (PUT)
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { identificador, nome } = req.body ?? {};

  if (!identificador && !nome) {
    return res
      .status(400)
      .json({ error: 'Pelo menos um campo (identificador ou nome) deve ser fornecido' });
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (identificador) {
    updates.push('matricula = ?');
    values.push(identificador);
  }

  if (nome) {
    updates.push('nome_completo = ?');
    values.push(nome);
  }

  values.push(id);

  const sql = `UPDATE ALUNO SET ${updates.join(', ')} WHERE id_aluno = ?`;

  try {
    const result: any = await execute(sql, values);

    // ER_DUP_ENTRY → identificador já cadastrado
    // (MySQL lançou antes, então este check é só fallback; mas mantemos a lógica do sqlite)
    if (result instanceof Error && (result as any).code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Identificador já cadastrado' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    return res.json({
      id: Number(id),
      identificador: identificador || undefined,
      nome: nome || undefined,
    });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Identificador já cadastrado' });
    }
    return res.status(500).json({ error: err.message });
  }
});

// Exclui Aluno (DELETE) - CORRIGIDO PARA LIMPAR DEPENDÊNCIAS
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Deleta REGISTRO_NOTA
    const sqlDeleteNotas = 'DELETE FROM REGISTRO_NOTA WHERE fk_aluno_id_aluno = ?';
    await conn.execute(sqlDeleteNotas, [id]);

    // 2. Deleta MATRICULA_TURMA
    const sqlDeleteMatriculas =
      'DELETE FROM MATRICULA_TURMA WHERE fk_aluno_id_aluno = ?';
    await conn.execute(sqlDeleteMatriculas, [id]);

    // 3. Deleta ALUNO
    const sqlDeleteAluno = 'DELETE FROM ALUNO WHERE id_aluno = ?';
    const [deleteAlunoResult]: any = await conn.execute(sqlDeleteAluno, [id]);

    if (deleteAlunoResult.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Aluno não encontrado.' });
    }

    await conn.commit();
    return res.json({ message: 'Aluno excluído do sistema com sucesso' });
  } catch (err: any) {
    await conn.rollback();
    console.error('Erro ao deletar aluno:', err.message);
    return res
      .status(500)
      .json({ error: 'Erro ao deletar aluno do sistema.' });
  } finally {
    conn.release();
  }
});

// Remove da Turma (DELETE)
router.delete('/:turma_id/remover/:aluno_id', async (req: Request, res: Response) => {
  const { turma_id, aluno_id } = req.params;

  const sql = `
    DELETE FROM MATRICULA_TURMA
    WHERE fk_turma_id_turma = ? AND fk_aluno_id_aluno = ?
  `;

  try {
    const result: any = await execute(sql, [turma_id, aluno_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Aluno não está nesta turma' });
    }

    return res.json({ message: 'Aluno removido da turma com sucesso' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Exportar Router
export default router;