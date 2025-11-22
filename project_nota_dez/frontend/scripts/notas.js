// Autor: Cadu Spadari (Script de Controle de Notas)

// Variáveis Globais de Controle
let listaInstituicoes = [];
let listaCursos = [];
let listaDisciplinas = [];
let listaTurmas = [];
let listaComponentes = [];

window.onload = function() {
    carregarDadosIniciais();
    configurarListenersModais();
    configurarFiltrosPrincipais();
};

// ====================================================
// 1. CARREGAMENTO DE DADOS E CASCATA (Essencial)
// ====================================================

function carregarDadosIniciais() {
    // Carrega Instituições (Raiz da cascata)
    fetch('/api/instituicoes')
        .then(r => r.json())
        .then(data => {
            listaInstituicoes = data;
            // Preenche APENAS os selects de instituição de todos os modais
            preencherSelect('selectInstituicaoCadastrar', data, 'Instituições cadastradas');
            preencherSelect('selectInstituicaoLancar', data, 'Instituições cadastradas');
            preencherSelect('selectInstituicaoExport', data, 'Instituições cadastradas');
        })
        .catch(e => console.error("Erro ao carregar instituições", e));

    // Para a página principal, carregamos todas as turmas e disciplinas para facilitar
    // (Já que o HTML principal não tem o filtro de Instituição/Curso visível no topo)
    carregarFiltrosPrincipais();
}

function carregarFiltrosPrincipais() {
    // Carrega Turmas para o filtro principal
    fetch('/api/turmas')
        .then(r => r.json())
        .then(data => {
            listaTurmas = data;
            preencherSelect('selectTurmaPrincipal', data, 'Turmas cadastradas', 'nome', 'id');
        });

    // Carrega Disciplinas para o filtro principal
    fetch('/api/disciplinas')
        .then(r => r.json())
        .then(data => {
            listaDisciplinas = data;
            preencherSelect('selectDisciplinaPrincipal', data, 'Disciplinas cadastradas', 'nome', 'id');
        });
}

// Função Genérica para configurar a cascata Instituição -> Curso -> Turma/Disciplina
function configurarCascata(sufixo) {
    const selInst = document.getElementById(`selectInstituicao${sufixo}`);
    const selCurso = document.getElementById(`selectCurso${sufixo}`);
    const selTurma = document.getElementById(`selectTurma${sufixo}`);
    const selDisc = document.getElementById(`selectDisciplina${sufixo}`);

    // 1. Ao selecionar Instituição -> Carrega Cursos
    if(selInst) {
        selInst.addEventListener('change', function() {
            const idInst = this.value;
            limparSelects([selCurso, selTurma, selDisc]); // Limpa os filhos
            
            fetch('/api/cursos') // Idealmente filtraria por instituição no back, mas faremos no front pelo JSON retornado se necessário, ou endpoint específico
                .then(r => r.json())
                .then(cursos => {
                    // Filtra cursos da instituição selecionada
                    const cursosFiltrados = cursos.filter(c => c.instituicao_id == idInst);
                    preencherSelect(`selectCurso${sufixo}`, cursosFiltrados, 'Cursos cadastrados');
                });
        });
    }

    // 2. Ao selecionar Curso -> Carrega Turmas e Disciplinas
    if(selCurso) {
        selCurso.addEventListener('change', function() {
            const idCurso = this.value;
            limparSelects([selTurma, selDisc]);

            // Carrega Turmas do Curso
            fetch('/api/turmas') // Pega todas e filtra (ou endpoint específico se existir)
                .then(r => r.json())
                .then(turmas => {
                    const turmasFiltradas = turmas.filter(t => t.curso_id == idCurso);
                    if(selTurma) preencherSelect(`selectTurma${sufixo}`, turmasFiltradas, 'Turmas do curso');
                });

            // Carrega Disciplinas do Curso
            fetch('/api/disciplinas')
                .then(r => r.json())
                .then(disciplinas => {
                    // O endpoint de disciplinas do server.ts não retorna curso_id explicitamente na lista global as vezes, 
                    // mas vamos assumir que retorna ou filtrar se possível.
                    // Se o endpoint GET /api/disciplinas retornar todos, precisamos filtrar no front.
                    // Verificando server.ts: ele retorna Rows. Vamos supor que tenha filtro ou retornamos tudo.
                    // Hack: Se não tiver fk_curso no JSON, mostramos todas.
                    const discFiltradas = disciplinas.filter(d => !d.fk_curso_id_curso || d.fk_curso_id_curso == idCurso); 
                    if(selDisc) preencherSelect(`selectDisciplina${sufixo}`, discFiltradas, 'Disciplinas do curso');
                });
        });
    }
}

function configurarListenersModais() {
    // Configura cascata para os 3 modais
    configurarCascata('Cadastrar'); // Modal Cadastro Componente
    configurarCascata('Lancar');    // Modal Lançar Nota
    configurarCascata('Export');    // Modal Exportar

    // Listener Específico: Modal Lançar Nota - Ao selecionar Disciplina -> Carregar Componentes
    const selDiscLancar = document.getElementById('selectDisciplinaLancar');
    if (selDiscLancar) {
        selDiscLancar.addEventListener('change', function() {
            carregarComponentesParaSelect(this.value, 'selectComponenteLancar');
        });
    }

    // Listener Específico: Modal Lançar Nota - Ao selecionar Componente -> Carregar Alunos
    const selCompLancar = document.getElementById('selectComponenteLancar');
    if (selCompLancar) {
        selCompLancar.addEventListener('change', function() {
            const turmaId = document.getElementById('selectTurmaLancar').value;
            const discId = document.getElementById('selectDisciplinaLancar').value;
            
            if(turmaId && discId) {
                preencherTabelaLancamento(turmaId, discId, this.value);
            }
        });
    }

    // Submit: Cadastrar Componente
    document.getElementById('formComponenteNota').addEventListener('submit', function(e) {
        e.preventDefault();
        salvarComponente();
    });

    // Submit: Salvar Notas (O botão está fora de form no HTML original, mas vamos tratar o clique)
    // No HTML enviado, o botão está dentro de .modal-footer sem ID. Vamos pegar pelo seletor do modal.
    const btnSalvarNotas = document.querySelector('#modalLancarNota .modal-footer .btn-primary');
    if(btnSalvarNotas) {
        btnSalvarNotas.onclick = salvarNotasLancadas;
    }

    // Submit: Exportar
    document.getElementById('formExportarNota').addEventListener('submit', function(e) {
        e.preventDefault();
        exportarNotas();
    });
}

function configurarFiltrosPrincipais() {
    const selTurma = document.getElementById('selectTurmaPrincipal');
    const selDisc = document.getElementById('selectDisciplinaPrincipal');

    const carregarTabela = () => {
        if(selTurma.value && selDisc.value) {
            carregarMatrizNotas(selTurma.value, selDisc.value);
        }
    };

    selTurma.addEventListener('change', carregarTabela);
    selDisc.addEventListener('change', carregarTabela);
}


// ====================================================
// 2. FUNÇÕES DE RENDERIZAÇÃO (DOM)
// ====================================================

// Preenche um <select> HTML
function preencherSelect(idElemento, dados, textoDefault, campoTexto = 'nome', campoValor = 'id') {
    const select = document.getElementById(idElemento);
    if (!select) return;

    select.innerHTML = `<option value="" selected disabled>${textoDefault}</option>`;
    
    dados.forEach(item => {
        const option = document.createElement('option');
        option.value = item[campoValor];
        // Tenta encontrar o nome em várias propriedades comuns
        option.textContent = item[campoTexto] || item.nome_disciplina || item.nome_turma || item.nome_instituicao || "Sem Nome"; 
        select.appendChild(option);
    });
}

function limparSelects(elementos) {
    elementos.forEach(el => {
        if(el) el.innerHTML = '<option value="" selected disabled>Aguardando seleção anterior...</option>';
    });
}

// Tabela Principal (Matriz de Notas)
function carregarMatrizNotas(turmaId, disciplinaId) {
    const tbody = document.getElementById('tbodyNotas');
    const thead = document.getElementById('cabecalhoTabela');
    
    tbody.innerHTML = '<tr><td colspan="10">Carregando...</td></tr>';

    fetch(`/api/notas/matriz?turma_id=${turmaId}&disciplina_id=${disciplinaId}`)
        .then(r => r.json())
        .then(data => {
            // 1. Reconstrói o Cabeçalho
            let htmlHead = `
                <th scope="col">Matrícula</th>
                <th scope="col">Nome Completo</th>
            `;
            data.componentes.forEach(comp => {
                htmlHead += `<th scope="col" title="${comp.descricao}">${comp.sigla}</th>`;
            });
            htmlHead += `<th scope="col">Média Final</th>`; // Coluna Extra
            thead.innerHTML = htmlHead;

            // 2. Constrói as Linhas
            tbody.innerHTML = '';
            
            if(data.alunos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="100%">Nenhum aluno nesta turma.</td></tr>';
                return;
            }

            data.alunos.forEach(aluno => {
                const tr = document.createElement('tr');
                
                let htmlRow = `
                    <td>${aluno.matricula}</td>
                    <td class="text-start">${aluno.nome_completo}</td>
                `;

                // Notas dos componentes
                let soma = 0;
                let divisor = 0;

                data.componentes.forEach(comp => {
                    const nota = aluno.notas[comp.id_componente];
                    const valor = nota !== undefined ? Number(nota).toFixed(2) : '-';
                    
                    if(nota !== undefined) {
                        soma += Number(nota);
                        divisor++;
                    }

                    htmlRow += `<td>${valor}</td>`;
                });

                // Calculo Simples de Média (Aritmética)
                // Obs: Se precisar de fórmula complexa, o backend deve processar ou usar eval() com cuidado
                const media = divisor > 0 ? (soma / divisor).toFixed(2) : '-';
                htmlRow += `<td class="fw-bold">${media}</td>`;

                tr.innerHTML = htmlRow;
                tbody.appendChild(tr);
            });
        })
        .catch(err => {
            console.error(err);
            mostrarAlerta('alertCampos'); // Reuso do alerta de erro
        });
}

// Tabela do Modal "Lançar Notas"
function preencherTabelaLancamento(turmaId, disciplinaId, componenteId) {
    const secao = document.getElementById('secaoTabelaAlunos');
    const tbody = document.getElementById('tbodyAlunos');
    
    secao.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>';

    // Reutilizamos a rota da matriz para pegar alunos e notas atuais
    fetch(`/api/notas/matriz?turma_id=${turmaId}&disciplina_id=${disciplinaId}`)
        .then(r => r.json())
        .then(data => {
            tbody.innerHTML = '';
            const componenteAtual = data.componentes.find(c => c.id_componente == componenteId);
            const sigla = componenteAtual ? componenteAtual.sigla : 'Nota';

            // Atualiza cabeçalho da coluna de nota
            const thNota = document.querySelector('.tabela-alunos thead tr th:nth-child(3)');
            if(thNota) thNota.textContent = `Nota (${sigla})`;

            data.alunos.forEach(aluno => {
                const notaAtual = aluno.notas[componenteId] !== undefined ? aluno.notas[componenteId] : '';
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="matricula">${aluno.matricula}</td>
                    <td class="text-start">${aluno.nome_completo}</td>
                    <td>
                        <input type="number" 
                               class="form-control nota-input text-center" 
                               min="0" max="10" step="0.01" 
                               data-aluno-id="${aluno.id_aluno}" 
                               value="${notaAtual}"
                               placeholder="0.00">
                    </td>
                `;
                tbody.appendChild(tr);
            });
        });
}

// ====================================================
// 3. AÇÕES DE SALVAR (POST/PUT)
// ====================================================

function salvarComponente() {
    const dados = {
        nome: document.getElementById('inputNomeComponente').value,
        sigla: document.getElementById('inputSiglaComponente').value,
        descricao: document.getElementById('inputDescricaoComponente').value,
        disciplina_id: document.getElementById('selectDisciplinaCadastrar').value
    };

    if(!dados.disciplina_id || !dados.nome) {
        mostrarAlerta('alertCampos');
        return;
    }

    fetch('/api/notas/componentes', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(dados)
    })
    .then(r => r.json())
    .then(res => {
        if(res.error) throw new Error(res.error);
        
        // Fecha modal e limpa
        const modalEl = document.getElementById('modalCadastrarComponente');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        document.getElementById('formComponenteNota').reset();
        
        mostrarAlerta('alertSucesso');
        
        // Atualiza a tela se estivermos vendo esta disciplina
        const discPrincipal = document.getElementById('selectDisciplinaPrincipal').value;
        if(discPrincipal == dados.disciplina_id) {
            document.getElementById('selectTurmaPrincipal').dispatchEvent(new Event('change'));
        }
    })
    .catch(err => {
        alert('Erro: ' + err.message);
    });
}

function salvarNotasLancadas() {
    const inputs = document.querySelectorAll('#tbodyAlunos .nota-input');
    const notasParaSalvar = [];
    const turmaId = document.getElementById('selectTurmaLancar').value;
    const componenteId = document.getElementById('selectComponenteLancar').value;

    inputs.forEach(input => {
        if(input.value !== '') {
            notasParaSalvar.push({
                aluno_id: input.getAttribute('data-aluno-id'),
                componente_id: componenteId,
                valor: input.value
            });
        }
    });

    if(notasParaSalvar.length === 0) {
        alert("Nenhuma nota preenchida para salvar.");
        return;
    }

    fetch('/api/notas/lancamento', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            turma_id: turmaId,
            notas: notasParaSalvar
        })
    })
    .then(r => r.json())
    .then(res => {
        if(res.error) throw new Error(res.error);

        const modalEl = document.getElementById('modalLancarNota');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        
        mostrarAlerta('alertSucesso');
        
        // Recarrega a tabela principal
        const turmaPrinc = document.getElementById('selectTurmaPrincipal').value;
        if(turmaPrinc == turmaId) {
            document.getElementById('selectTurmaPrincipal').dispatchEvent(new Event('change'));
        }
    })
    .catch(err => alert('Erro ao salvar: ' + err.message));
}

function exportarNotas() {
    const turmaId = document.getElementById('selectTurmaExport').value;
    const discId = document.getElementById('selectDisciplinaExport').value;

    if(!turmaId || !discId) {
        alert("Selecione Turma e Disciplina");
        return;
    }

    window.location.href = `/api/notas/exportar?turma_id=${turmaId}&disciplina_id=${discId}`;
}

// ====================================================
// 4. UTILITÁRIOS
// ====================================================

function carregarComponentesParaSelect(disciplinaId, selectId) {
    fetch(`/api/notas/disciplina/${disciplinaId}/componentes`)
        .then(r => r.json())
        .then(data => {
            preencherSelect(selectId, data, 'Selecione o componente', 'nome_componente', 'id_componente');
        });
}

function mostrarAlerta(id) {
    const el = document.getElementById(id);
    if(el) {
        el.classList.remove('d-none');
        setTimeout(() => el.classList.add('d-none'), 3000);
    }
}