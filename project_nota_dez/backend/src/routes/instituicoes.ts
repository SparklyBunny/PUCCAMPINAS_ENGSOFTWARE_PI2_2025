// Autor Geral: Cadu Spadari - Autor Código BD: Felipe N. C. Moussa
// Express & BD
import { Router, Request, Response } from 'express';
import { query, execute } from '../database';
const router = Router();

// Lista todas as instituições (GET)
router.get('/', async function (_req: Request, res: Response) {
  const sql = `
    SELECT
      id_instituicao AS id,
      nome_instituicao AS nome,
      fk_usuario_id_usuario AS usuario_id,
      NULL AS criado_em
    FROM INSTITUICAO
    ORDER BY id_instituicao DESC
  `;

  try {
    const rows = await query<any>(sql, []);
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// Busca instituição por ID (GET)
router.get('/:id', async function (req: Request, res: Response) {
  const id = req.params.id;

  const sql = `
    SELECT
      id_instituicao AS id,
      nome_instituicao AS nome,
      fk_usuario_id_usuario AS usuario_id
    FROM INSTITUICAO
    WHERE id_instituicao = ?
  `;

  try {
    const rows = await query<any>(sql, [id]);
    const row = rows[0];

    if (!row) {
      return res.status(404).json({ error: 'Instituição não encontrada' });
    }

    return res.json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// Cria nova instituição (POST)
router.post('/', async function (req: Request, res: Response) {
  const nome = req.body.nome;
  const usuario_id = req.body.usuario_id;

  if (!nome) {
    return res.status(400).json({ error: 'Nome da instituição é obrigatório' });
  }

  const inserirInstituicao = async (fkUsuarioId: number) => {
    const sql = `
      INSERT INTO INSTITUICAO (nome_instituicao, fk_usuario_id_usuario)
      VALUES (?, ?)
    `;
    try {
      const result: any = await execute(sql, [nome, fkUsuarioId]);
      return res.status(201).json({
        id: result.insertId,
        nome: nome,
        usuario_id: Number(fkUsuarioId),
      });
    } catch (err: any) {
      // DUPLICATE -> instituição já cadastrada (comportamento INSERT OR IGNORE anteriormente)
      if (err && err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Instituição já cadastrada' });
      }
      // FK erro -> usuário não encontrado para associação
      if (err && (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2')) {
        return res.status(404).json({ error: 'Usuário não encontrado para associação' });
      }
      return res.status(500).json({ error: err?.message ?? String(err) });
    }
  };

  if (usuario_id) {
    return inserirInstituicao(Number(usuario_id));
  }

  try {
    const rows = await query<any>('SELECT id_usuario FROM USUARIO LIMIT 1', []);
    const row = rows[0];

    if (!row || !row.id_usuario) {
      return res.status(400).json({
        error:
          'Não há usuário disponível para associar à instituição. Forneça "usuario_id" no corpo da requisição ou crie um usuário primeiro.',
      });
    }

    return inserirInstituicao(row.id_usuario);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// Atualiza instituição (PUT)
router.put('/:id', async function (req: Request, res: Response) {
  const id = req.params.id;
  const nome = req.body.nome;

  if (!nome) {
    return res.status(400).json({ error: 'Nome da instituição é obrigatório' });
  }

  const sql = 'UPDATE INSTITUICAO SET nome_instituicao = ? WHERE id_instituicao = ?';

  try {
    const result: any = await execute(sql, [nome, id]);

    if (!result.affectedRows || result.affectedRows === 0) {
      return res.status(404).json({ error: 'Instituição não encontrada' });
    }

    return res.json({ id: Number(id), nome: nome });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// Exclui instituição (DELETE)
router.delete('/:id', async function (req: Request, res: Response) {
  const id = req.params.id;

  const sql = 'DELETE FROM INSTITUICAO WHERE id_instituicao = ?';

  try {
    const result: any = await execute(sql, [id]);

    if (!result.affectedRows || result.affectedRows === 0) {
      return res.status(404).json({ error: 'Instituição não encontrada' });
    }

    return res.json({ message: 'Instituição excluída com sucesso' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// Exportar Router
export default router;