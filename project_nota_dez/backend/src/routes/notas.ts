import { Router, Request, Response } from 'express';
import { query, execute } from '../database';

const router = Router();

// ==========================================
// ROTA 1: Listar dados para os Dropdowns (Cascata)
// ==========================================

// Busca componentes de uma disciplina
router.get('/disciplina/:id/componentes', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const rows = await query<any>(
      'SELECT * FROM COMPONENTE_NOTA WHERE fk_disciplina_id_disciplina = ?',
      [id]
    );
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// ==========================================
// ROTA 2: Gestão de Componentes de Nota
// ==========================================

router.post('/componentes', async (req: Request, res: Response) => {
  const { nome, sigla, descricao, disciplina_id } = req.body;

  if (!nome || !disciplina_id) {
    return res
      .status(400)
      .json({ error: 'Nome e Disciplina são obrigatórios.' });
  }

  const sql = `
    INSERT INTO COMPONENTE_NOTA (nome_componente, sigla, descricao, fk_disciplina_id_disciplina)
    VALUES (?, ?, ?, ?)
  `;

  try {
    const result: any = await execute(sql, [
      nome,
      sigla ?? null,
      descricao ?? null,
      disciplina_id,
    ]);

    return res.json({
      id: result.insertId,
      message: 'Componente criado com sucesso!',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// ==========================================
// ROTA 3: Matriz de Notas (Para a Tabela Principal)
// ==========================================
// Retorna os alunos da turma e suas notas em cada componente da disciplina
router.get('/matriz', async (req: Request, res: Response) => {
  const { turma_id, disciplina_id } = req.query;

  if (!turma_id || !disciplina_id) {
    return res
      .status(400)
      .json({ error: 'Turma e Disciplina são obrigatórios.' });
  }

  const sqlAlunos = `
    SELECT a.id_aluno, a.nome_completo, a.matricula 
    FROM ALUNO a
    JOIN MATRICULA_TURMA mt ON a.id_aluno = mt.fk_aluno_id_aluno
    WHERE mt.fk_turma_id_turma = ?
    ORDER BY a.nome_completo
  `;

  const sqlComponentes = `
    SELECT * FROM COMPONENTE_NOTA
    WHERE fk_disciplina_id_disciplina = ?
  `;

  const sqlNotas = `
    SELECT fk_aluno_id_aluno, fk_componente_nota_id_componente, valor_nota 
    FROM REGISTRO_NOTA 
    WHERE fk_turma_id_turma = ?
  `;

  try {
    const [alunos, componentes, notas] = await Promise.all([
      query<any>(sqlAlunos, [turma_id]),
      query<any>(sqlComponentes, [disciplina_id]),
      query<any>(sqlNotas, [turma_id]),
    ]);

    const resultado = {
      componentes,
      alunos: (alunos || []).map((aluno: any) => {
        const notasAluno: Record<string, number> = {};
        (notas || [])
          .filter((n: any) => n.fk_aluno_id_aluno === aluno.id_aluno)
          .forEach((n: any) => {
            notasAluno[n.fk_componente_nota_id_componente] = n.valor_nota;
          });

        return {
          ...aluno,
          notas: notasAluno,
        };
      }),
    };

    return res.json(resultado);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// ==========================================
// ROTA 4: Lançamento de Notas
// ==========================================
router.post('/lancamento', async (req: Request, res: Response) => {
  const { notas, turma_id } = req.body;
  // Espera: notas = [{ aluno_id, componente_id, valor }, ...]

  if (!Array.isArray(notas) || !turma_id) {
    return res.status(400).json({ error: 'Dados inválidos.' });
  }

  // Vamos usar transação MySQL para replicar BEGIN/COMMIT/ROLLBACK
  const conn = await (await import('../database')).getConnection?.();

  // Caso você não esteja expondo getConnection, podemos simular com execute('START TRANSACTION'), etc.
  if (!conn) {
    // fallback: usando execute direto com comandos de transação
    try {
      await execute('START TRANSACTION', []);
      for (const n of notas) {
        let valor = parseFloat(n.valor);
        if (Number.isNaN(valor)) valor = 0;

        await execute(
          `
          INSERT INTO REGISTRO_NOTA (valor_nota, fk_componente_nota_id_componente, fk_aluno_id_aluno, fk_turma_id_turma)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE valor_nota = VALUES(valor_nota)
        `,
          [valor, n.componente_id, n.aluno_id, turma_id]
        );
      }
      await execute('COMMIT', []);
      return res.json({ message: 'Notas salvas com sucesso!' });
    } catch (err: any) {
      await execute('ROLLBACK', []).catch(() => {});
      return res
        .status(500)
        .json({ error: 'Erro ao salvar notas: ' + (err?.message ?? String(err)) });
    }
  }

  // Caminho com conexão explícita (caso exista getConnection no seu database.ts)
  try {
    await conn.beginTransaction();

    for (const n of notas) {
      let valor = parseFloat(n.valor);
      if (Number.isNaN(valor)) valor = 0;

      await conn.execute(
        `
        INSERT INTO REGISTRO_NOTA (valor_nota, fk_componente_nota_id_componente, fk_aluno_id_aluno, fk_turma_id_turma)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE valor_nota = VALUES(valor_nota)
      `,
        [valor, n.componente_id, n.aluno_id, turma_id]
      );
    }

    await conn.commit();
    conn.release();
    return res.json({ message: 'Notas salvas com sucesso!' });
  } catch (err: any) {
    try {
      await conn.rollback();
    } catch {}
    conn.release();
    return res
      .status(500)
      .json({ error: 'Erro ao salvar notas: ' + (err?.message ?? String(err)) });
  }
});

// ==========================================
// ROTA 5: Exportação (Gera CSV)
// ==========================================
router.get('/exportar', async (req: Request, res: Response) => {
  const { turma_id, disciplina_id } = req.query;

  const sqlAlunos = `
    SELECT a.id_aluno, a.nome_completo, a.matricula 
    FROM ALUNO a
    JOIN MATRICULA_TURMA mt ON a.id_aluno = mt.fk_aluno_id_aluno
    WHERE mt.fk_turma_id_turma = ?
    ORDER BY a.nome_completo
  `;
  const sqlComponentes = `
    SELECT * FROM COMPONENTE_NOTA
    WHERE fk_disciplina_id_disciplina = ?
  `;
  const sqlNotas = `
    SELECT fk_aluno_id_aluno, fk_componente_nota_id_componente, valor_nota
    FROM REGISTRO_NOTA
    WHERE fk_turma_id_turma = ?
  `;

  try {
    const [alunos, componentes, notas] = await Promise.all([
      query<any>(sqlAlunos, [turma_id]),
      query<any>(sqlComponentes, [disciplina_id]),
      query<any>(sqlNotas, [turma_id]),
    ]);

    let csv = 'Matricula;Nome;';
    (componentes || []).forEach((c: any) => {
      csv += `${c.sigla} - ${c.nome_componente};`;
    });
    csv += 'Media Final\n';

    (alunos || []).forEach((aluno: any) => {
      csv += `${aluno.matricula};${aluno.nome_completo};`;
      let soma = 0;
      let conta = 0;

      (componentes || []).forEach((comp: any) => {
        const nota = (notas || []).find(
          (n: any) =>
            n.fk_aluno_id_aluno === aluno.id_aluno &&
            n.fk_componente_nota_id_componente === comp.id_componente
        );
        const valor: number = nota ? Number(nota.valor_nota) : 0;
        csv += `${valor.toFixed(2).replace('.', ',')};`;
        soma += valor;
        conta++;
      });

      const media = conta > 0 ? soma / conta : 0;
      csv += `${media.toFixed(2).replace('.', ',')}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('notas.csv');
    return res.send(csv);
  } catch (err: any) {
    return res.status(500).send('Erro ao gerar CSV: ' + (err?.message ?? String(err)));
  }
});

export default router;