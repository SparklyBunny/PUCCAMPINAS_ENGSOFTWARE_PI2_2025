// Autor Geral: Cadu Spadari - Autor Código BD: Felipe N. C. Moussa
// Express & BD
import { Router, Request, Response } from 'express';
import { query, execute } from '../database';

const router = Router();

// Lista todas as disciplinas (GET)
router.get('/', async function (_req: Request, res: Response) {
  const sql = `
    SELECT
      id_disciplina AS id,
      nome_disciplina AS nome,
      sigla,
      codigo,
      periodo,
      formula_calculo
    FROM DISCIPLINA
    ORDER BY nome_disciplina ASC
  `;

  try {
    const rows = await query<any>(sql, []);
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// Busca disciplina por ID (GET)
router.get('/:id', async function (req: Request, res: Response) {
  const id = req.params.id;

  const sql = `
    SELECT
      id_disciplina AS id,
      nome_disciplina AS nome,
      sigla,
      codigo,
      periodo,
      formula_calculo
    FROM DISCIPLINA
    WHERE id_disciplina = ?
  `;

  try {
    const rows = await query<any>(sql, [id]);
    const row = rows[0];

    if (!row) {
      return res.status(404).json({ error: 'Disciplina não encontrada' });
    }

    return res.json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// Cria nova disciplina (POST)
router.post('/', async function (req: Request, res: Response) {
  const nome = req.body.nome;
  const sigla = req.body.sigla;
  const codigo = req.body.codigo;
  const periodo = req.body.periodo;
  const formula_calculo = req.body.formula_calculo ?? null;

  const curso_id_body =
    req.body.curso_id !== undefined && req.body.curso_id !== null
      ? Number(req.body.curso_id)
      : null;

  if (!nome) {
    return res
      .status(400)
      .json({ error: 'Nome da disciplina é obrigatório' });
  }

  const inserirDisciplina = async (fk_curso_id: number) => {
    const sql = `
      INSERT INTO DISCIPLINA (nome_disciplina, sigla, codigo, periodo, formula_calculo, fk_curso_id_curso)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    try {
      const result: any = await execute(sql, [
        nome,
        sigla || null,
        codigo || null,
        periodo || null,
        formula_calculo,
        fk_curso_id,
      ]);

      return res.status(201).json({
        id: result.insertId,
        nome,
        sigla: sigla || null,
        codigo: codigo || null,
        periodo: periodo || null,
        formula_calculo: formula_calculo,
      });
    } catch (err: any) {
      // Se em algum momento você definir UNIQUE para nome+curso, poderia mapear ER_DUP_ENTRY aqui
      return res.status(500).json({ error: err?.message ?? String(err) });
    }
  };

  // Se veio curso_id no body e é numérico, usa ele
  if (curso_id_body !== null && !Number.isNaN(curso_id_body)) {
    return inserirDisciplina(Number(curso_id_body));
  }

  // Senão, tenta pegar o primeiro curso cadastrado
  try {
    const rows = await query<any>('SELECT id_curso FROM CURSO LIMIT 1', []);
    const row = rows[0];

    if (!row || !row.id_curso) {
      return res.status(400).json({
        error:
          'Não existe curso cadastrado no sistema. Para criar uma disciplina, crie primeiro um curso ou envie "curso_id" no corpo da requisição.',
      });
    }

    return inserirDisciplina(row.id_curso);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// Atualiza disciplina (PUT)
router.put('/:id', async function (req: Request, res: Response) {
  const id = req.params.id;
  const nome = req.body.nome;
  const sigla = req.body.sigla;
  const codigo = req.body.codigo;
  const periodo = req.body.periodo;
  const formula_calculo = req.body.formula_calculo ?? null;

  if (!nome) {
    return res
      .status(400)
      .json({ error: 'Nome da disciplina é obrigatório' });
  }

  const sql = `
    UPDATE DISCIPLINA
    SET nome_disciplina = ?, sigla = ?, codigo = ?, periodo = ?, formula_calculo = ?
    WHERE id_disciplina = ?
  `;

  try {
    const result: any = await execute(sql, [
      nome,
      sigla || null,
      codigo || null,
      periodo || null,
      formula_calculo,
      id,
    ]);

    if (!result.affectedRows || result.affectedRows === 0) {
      return res.status(404).json({ error: 'Disciplina não encontrada' });
    }

    return res.json({
      id: Number(id),
      nome,
      sigla: sigla || null,
      codigo: codigo || null,
      periodo: periodo || null,
      formula_calculo: formula_calculo,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// Exclui disciplina (DELETE)
router.delete('/:id', async function (req: Request, res: Response) {
  const id = req.params.id;

  const sql = 'DELETE FROM DISCIPLINA WHERE id_disciplina = ?';

  try {
    const result: any = await execute(sql, [id]);

    if (!result.affectedRows || result.affectedRows === 0) {
      return res.status(404).json({ error: 'Disciplina não encontrada' });
    }

    return res.json({ message: 'Disciplina excluída com sucesso' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// Exportar Router
export default router;