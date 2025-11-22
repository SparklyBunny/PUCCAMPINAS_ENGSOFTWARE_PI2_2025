// Autor Geral: Cadu Spadari - Autor Código BD: Felipe N. C. Moussa
// Express & BD
import { Router, Request, Response } from 'express';
import { query, execute } from '../database';

const router = Router();

// Criar Instituicao e Curso (POST)
router.post('/', async (req: Request, res: Response) => {
  const { nome_instituicao, nome_curso, usuario_id } = req.body ?? {};

  if (!nome_instituicao || !nome_curso) {
    return res.status(400).json({
      error: 'Nome da instituição e nome do curso são obrigatórios',
    });
  }

  const inserirCurso = async (instituicaoId: number) => {
    const sqlCurso = `
      INSERT INTO CURSO (nome_curso, fk_instituicao_id_instituicao)
      VALUES (?, ?)
    `;

    try {
      const result: any = await execute(sqlCurso, [nome_curso, instituicaoId]);
      return res.status(201).json({
        instituicao: {
          id: instituicaoId,
          nome: nome_instituicao,
        },
        curso: {
          id: result.insertId,
          nome: nome_curso,
          instituicao_id: instituicaoId,
        },
      });
    } catch (err: any) {
      // Em SQLite você checava "UNIQUE constraint failed";
      // em MySQL isso vira ER_DUP_ENTRY.
      if (err && err.code === 'ER_DUP_ENTRY') {
        return res
          .status(409)
          .json({ error: 'Curso já cadastrado nesta instituição' });
      }
      return res.status(500).json({ error: err?.message ?? String(err) });
    }
  };

  const handleWithUsuarioId = async (fkUsuarioId: number) => {
    // Em SQLite: INSERT OR IGNORE
    // Em MySQL: simulamos com INSERT normal e tratamos ER_DUP_ENTRY como "ignore".
    const sqlInstituicao = `
      INSERT INTO INSTITUICAO (nome_instituicao, fk_usuario_id_usuario)
      VALUES (?, ?)
    `;

    try {
      await execute(sqlInstituicao, [nome_instituicao, fkUsuarioId]);
      // Se inseriu ou já existia, em ambos os casos buscamos o id abaixo
    } catch (err: any) {
      if (err && err.code !== 'ER_DUP_ENTRY') {
        // Erros que não são de duplicidade devem ser retornados
        return res.status(500).json({ error: err?.message ?? String(err) });
      }
      // ER_DUP_ENTRY => comportamento "IGNORE": segue para buscar o id
    }

    try {
      const rows = await query<any>(
        'SELECT id_instituicao FROM INSTITUICAO WHERE nome_instituicao = ?',
        [nome_instituicao],
      );
      const row = rows[0];

      if (!row || !row.id_instituicao) {
        return res.status(500).json({
          error: 'Não foi possível recuperar o ID da instituição',
        });
      }

      const instituicaoId = row.id_instituicao;
      return inserirCurso(instituicaoId);
    } catch (err2: any) {
      return res.status(500).json({ error: err2?.message ?? String(err2) });
    }
  };

  if (usuario_id) {
    // Se usuario_id foi passado no body, usa ele
    return handleWithUsuarioId(Number(usuario_id));
  } else {
    // Caso contrário, pega o primeiro usuário existente
    try {
      const rows = await query<any>(
        'SELECT id_usuario FROM USUARIO LIMIT 1',
      );
      const row = rows[0];

      if (!row || !row.id_usuario) {
        return res.status(400).json({
          error:
            'Não há usuário disponível para associar à instituição. Forneça "usuario_id" no corpo da requisição ou crie um usuário primeiro.',
        });
      }

      return handleWithUsuarioId(row.id_usuario);
    } catch (err: any) {
      return res.status(500).json({ error: err?.message ?? String(err) });
    }
  }
});

// Exportar Router
export default router;