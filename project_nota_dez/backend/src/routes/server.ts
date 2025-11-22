// Autor: Cadu Spadari
// Express
import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import cors from 'cors';

import authRoutes from './auth';
import instituicoesRoutes from './instituicoes';
import cursosRoutes from './cursos';
import disciplinasRoutes from './disciplinas';
import turmasRoutes from './turmas';
import alunosRoutes from './alunos';
import notasRoutes from './notas';
import cadastroInicialRoutes from './cadastro-inicial';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', function(req: any, res: any) {
  res.send('ok');
});

// Rotas de autenticação
app.use('/api/auth', authRoutes);

// Rotas de cadastro inicial (instituição + curso)
app.use('/api/cadastro-inicial', cadastroInicialRoutes);

// Rotas de instituições
app.use('/api/instituicoes', instituicoesRoutes);

// Rotas de cursos
app.use('/api/cursos', cursosRoutes);

// Rotas de disciplinas
app.use('/api/disciplinas', disciplinasRoutes);

// Rotas de turmas
app.use('/api/turmas', turmasRoutes);

//Rotas de notas
app.use('/api/notas', notasRoutes);

// Rotas de alunos
app.use('/api/alunos', alunosRoutes);

// Arquivos estáticos do frontend
app.use('/', express.static(path.join(process.cwd(), '../frontend')));

// Inicializa servidor
app.listen(PORT, () => {
  console.log(`✅ Server ON http://localhost:${PORT}`);
});