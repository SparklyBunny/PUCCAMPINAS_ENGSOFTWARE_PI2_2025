// Autor Geral: Cadu Spadari - Autor Código BD: Felipe N. C. Moussa
// Express & BD
import { Router, Request, Response } from 'express';
import { query, execute } from '../database';

const router = Router();

// Lista todos os cursos (GET)
router.get('/', async (_req: Request, res: Response) => {
  const sql = `
    SELECT
      c.id_curso AS id,
      c.nome_curso AS nome,
      c.fk_instituicao_id_instituicao AS instituicao_id,
      i.nome_instituicao AS instituicao_nome,
      NULL AS criado_em
    FROM CURSO c
    INNER JOIN INSTITUICAO i ON c.fk_instituicao_id_instituicao = i.id_instituicao
    ORDER BY i.nome_instituicao, c.nome_curso
  `;

  try {
    const rows = await query<any>(sql, []);
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// Busca curso por ID (GET)
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const sql = `
    SELECT
      c.id_curso AS id,
      c.nome_curso AS nome,
      c.fk_instituicao_id_instituicao AS instituicao_id,
      i.nome_instituicao AS instituicao_nome,
      NULL AS criado_em
    FROM CURSO c
    INNER JOIN INSTITUICAO i ON c.fk_instituicao_id_instituicao = i.id_instituicao
    WHERE c.id_curso = ?
  `;

  try {
    const rows = await query<any>(sql, [id]);
    const row = rows[0];

    if (!row) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    return res.json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// Cria novo curso (POST)
router.post('/', async (req: Request, res: Response) => {
  const { nome, instituicao_id } = req.body ?? {};

  if (!nome || !instituicao_id) {
    return res.status(400).json({
      error: 'Nome do curso e ID da instituição são obrigatórios',
    });
  }

  const sql =
    'INSERT INTO CURSO (nome_curso, fk_instituicao_id_instituicao) VALUES (?, ?)';

  try {
    const result: any = await execute(sql, [nome, instituicao_id]);

    return res.status(201).json({
      id: result.insertId,
      nome,
      instituicao_id: Number(instituicao_id),
    });
  } catch (err: any) {
    // Em SQLite você checava strings; em MySQL mapeamos para códigos
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res
        .status(409)
        .json({ error: 'Curso já cadastrado nesta instituição' });
    }

    if (err && err.code === 'ER_NO_REFERENCED_ROW_2') {
      // FK para INSTITUICAO inválida
      return res.status(404).json({ error: 'Instituição não encontrada' });
    }

    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// Atualiza curso (PUT)
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nome } = req.body ?? {};

  if (!nome) {
    return res
      .status(400)
      .json({ error: 'Nome do curso é obrigatório' });
  }

  const sql = 'UPDATE CURSO SET nome_curso = ? WHERE id_curso = ?';

  try {
    const result: any = await execute(sql, [nome, id]);

    if (!result.affectedRows || result.affectedRows === 0) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    return res.json({ id: Number(id), nome });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// Exclui curso (DELETE)
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const sql = 'DELETE FROM CURSO WHERE id_curso = ?';

  try {
    const result: any = await execute(sql, [id]);

    if (!result.affectedRows || result.affectedRows === 0) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    return res.json({ message: 'Curso excluído com sucesso' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// Exportar Router
export default router;