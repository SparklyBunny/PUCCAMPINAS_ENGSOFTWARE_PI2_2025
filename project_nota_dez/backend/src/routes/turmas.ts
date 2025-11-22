// autor: Cadu Spadari (adaptado para novo schema TURMA com fk_disciplina e fk_curso)
import { Router, Request, Response } from 'express';
import { query, execute } from '../database';

const router = Router();

/**
 * Helper: transforma possíveis strings vazias/nulos em número (ou null)
 */
function toNumberOrNull(v: any): number | null {
  if (v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/**
 * GET /api/turmas
 */
router.get('/', async (_req: Request, res: Response) => {
  const sql = `
    SELECT
      t.id_turma AS id,
      t.nome_turma AS nome,
      d.fk_curso_id_curso AS curso_id,
      c.nome_curso AS curso_nome,
      c.fk_instituicao_id_instituicao AS instituicao_id,
      i.nome_instituicao AS instituicao_nome,
      NULL AS criado_em
    FROM TURMA t
    INNER JOIN DISCIPLINA d ON t.fk_disciplina_id_disciplina = d.id_disciplina
    INNER JOIN CURSO c ON d.fk_curso_id_curso = c.id_curso
    INNER JOIN INSTITUICAO i ON c.fk_instituicao_id_instituicao = i.id_instituicao
    ORDER BY i.nome_instituicao, c.nome_curso, t.nome_turma
  `;

  try {
    const rows = await query<any>(sql, []);
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

/**
 * GET /api/turmas/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const sql = `
    SELECT
      t.id_turma AS id,
      t.nome_turma AS nome,
      d.fk_curso_id_curso AS curso_id,
      c.nome_curso AS curso_nome,
      c.fk_instituicao_id_instituicao AS instituicao_id,
      i.nome_instituicao AS instituicao_nome,
      NULL AS criado_em
    FROM TURMA t
    INNER JOIN DISCIPLINA d ON t.fk_disciplina_id_disciplina = d.id_disciplina
    INNER JOIN CURSO c ON d.fk_curso_id_curso = c.id_curso
    INNER JOIN INSTITUICAO i ON c.fk_instituicao_id_instituicao = i.id_instituicao
    WHERE t.id_turma = ?
  `;

  try {
    const rows = await query<any>(sql, [id]);
    const row = rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Turma não encontrada' });
    }
    return res.json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

/**
 * POST /api/turmas
 * - aceita payload { nome, curso_id, disciplina_ids }
 * - tenta usar a primeira disciplina válida que pertença ao curso selecionado
 * - se não vier disciplina_ids, escolhe a primeira disciplina do curso (fallback)
 * - se não houver disciplina no curso, retorna erro explicando o motivo
 */
router.post('/', async (req: Request, res: Response) => {
  const nomeRaw = req.body?.nome;
  const cursoIdRaw = req.body?.curso_id;
  const disciplinaIdsRaw = req.body?.disciplina_ids;

  const nome = typeof nomeRaw === 'string' ? nomeRaw.trim() : nomeRaw;
  const curso_id = toNumberOrNull(cursoIdRaw);
  const disciplina_ids: number[] = Array.isArray(disciplinaIdsRaw)
    ? disciplinaIdsRaw
        .map((x: any) => toNumberOrNull(x))
        .filter((x: any) => x !== null) as number[]
    : [];

  if (!nome || !curso_id) {
    return res
      .status(400)
      .json({ error: 'Nome da turma e ID do curso são obrigatórios' });
  }

  try {
    // Verifica se o curso existe
    const cursoRows = await query<any>(
      'SELECT id_curso, nome_curso FROM CURSO WHERE id_curso = ?',
      [curso_id]
    );
    const cursoRow = cursoRows[0];
    if (!cursoRow) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    const inserirTurma = async (disciplinaIdToUse: number) => {
      const sqlTurma = `
        INSERT INTO TURMA (nome_turma, fk_disciplina_id_disciplina, fk_curso_id_curso)
        VALUES (?, ?, ?)
      `;

      try {
        const result: any = await execute(sqlTurma, [
          nome,
          disciplinaIdToUse,
          curso_id,
        ]);

        const turmaId = result.insertId;

        if (disciplina_ids.length > 1) {
          return res.status(201).json({
            id: turmaId,
            nome,
            curso_id: Number(curso_id),
            disciplina_ids,
            avisos: [
              'A nova modelagem aceita apenas uma disciplina por turma; apenas o primeiro disciplina_id foi associada.',
            ],
          });
        }

        return res.status(201).json({
          id: turmaId,
          nome,
          curso_id: Number(curso_id),
          disciplina_ids: [Number(disciplinaIdToUse)],
        });
      } catch (errInsert: any) {
        const msg = errInsert?.message ?? String(errInsert);
        if (msg.includes('Duplicate entry') || msg.includes('UNIQUE')) {
          return res
            .status(409)
            .json({ error: 'Turma já cadastrada neste curso/disciplina' });
        }
        if (msg.includes('FOREIGN KEY')) {
          return res
            .status(404)
            .json({ error: 'Disciplina ou curso não encontrado' });
        }
        return res.status(500).json({ error: msg });
      }
    };

    // Se vier disciplina_ids: procurar a primeira que pertença ao curso
    if (disciplina_ids.length > 0) {
      const placeholders = disciplina_ids.map(() => '?').join(',');
      const sql = `
        SELECT id_disciplina
        FROM DISCIPLINA
        WHERE id_disciplina IN (${placeholders})
          AND fk_curso_id_curso = ?
        LIMIT 1
      `;
      const params = [...disciplina_ids, curso_id];

      const discSelRows = await query<any>(sql, params);
      const discSelRow = discSelRows[0];

      if (discSelRow && discSelRow.id_disciplina) {
        return inserirTurma(discSelRow.id_disciplina);
      }

      // Nenhuma das disciplinas enviadas pertence ao curso -> fallback: primeira disciplina do curso
      const fallbackRows = await query<any>(
        'SELECT id_disciplina FROM DISCIPLINA WHERE fk_curso_id_curso = ? LIMIT 1',
        [curso_id]
      );
      const found = fallbackRows[0];

      if (!found) {
        return res.status(400).json({
          error:
            'Nenhuma disciplina encontrada para o curso informado. Informe disciplina_ids válidas ou crie uma disciplina para o curso.',
        });
      }

      return inserirTurma(found.id_disciplina);
    }

    // Não veio disciplina_ids: escolhe a primeira disciplina do curso (fallback)
    const fallbackRows2 = await query<any>(
      'SELECT id_disciplina FROM DISCIPLINA WHERE fk_curso_id_curso = ? LIMIT 1',
      [curso_id]
    );
    const found2 = fallbackRows2[0];

    if (!found2) {
      return res.status(400).json({
        error:
          'Nenhuma disciplina encontrada para o curso informado. Informe disciplina_ids ou crie uma disciplina para o curso.',
      });
    }

    return inserirTurma(found2.id_disciplina);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

/**
 * PUT /api/turmas/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const nomeRaw = req.body?.nome;
  const nome = typeof nomeRaw === 'string' ? nomeRaw.trim() : nomeRaw;

  if (!nome) {
    return res.status(400).json({ error: 'Nome da turma é obrigatório' });
  }

  const sql = 'UPDATE TURMA SET nome_turma = ? WHERE id_turma = ?';

  try {
    const result: any = await execute(sql, [nome, id]);
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Turma não encontrada' });
    }

    return res.json({ id: Number(id), nome });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

/**
 * DELETE /api/turmas/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const sql = 'DELETE FROM TURMA WHERE id_turma = ?';

  try {
    const result: any = await execute(sql, [id]);
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Turma não encontrada' });
    }
    return res.json({ message: 'Turma excluída com sucesso' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

/**
 * GET /api/turmas/:id/alunos
 */
router.get('/:id/alunos', async (req: Request, res: Response) => {
  const { id } = req.params;

  const sql = `
    SELECT
      a.id_aluno AS id,
      a.matricula AS identificador,
      a.nome_completo AS nome,
      NULL AS criado_em
    FROM ALUNO a
    INNER JOIN MATRICULA_TURMA mt ON a.id_aluno = mt.fk_aluno_id_aluno
    WHERE mt.fk_turma_id_turma = ?
    ORDER BY a.nome_completo
  `;

  try {
    const rows = await query<any>(sql, [id]);
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

/**
 * GET /api/turmas/:id/disciplinas
 */
router.get('/:id/disciplinas', async (req: Request, res: Response) => {
  const { id } = req.params;

  const sql = `
    SELECT
      d.id_disciplina AS id,
      d.nome_disciplina AS nome,
      NULL AS criado_em
    FROM DISCIPLINA d
    INNER JOIN TURMA t ON t.fk_disciplina_id_disciplina = d.id_disciplina
    WHERE t.id_turma = ?
  `;

  try {
    const rows = await query<any>(sql, [id]);
    return res.json(rows || []);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

export default router;