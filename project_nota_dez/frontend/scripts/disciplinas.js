// Autor: Cadu Spadari

// Variáveis globais
var disciplinas = [];
var instituicoes = [];
var cursos = [];
var disciplinaEditando = null;

window.onload = function() {
  carregarInstituicoes();
  carregarCursos();
  carregarDisciplinas();

  document.getElementById('formNovaDisciplina').onsubmit = function(e) {
    e.preventDefault();
    criarDisciplina();
  };

  document.getElementById('formEditarDisciplinas').onsubmit = function(e) {
    e.preventDefault();
    salvarEdicaoDisciplina();
  };

  document.getElementById('selectInstituicao').onchange = function() {
    atualizarCursosPorInstituicao(this.value);
  };

  setTimeout(adicionarEventosBotoes, 500);
};

// Adiciona eventos aos botões de editar e excluir
function adicionarEventosBotoes() {
  document.querySelectorAll('.btn-outline-warning').forEach(function(btn) {
    if (btn.textContent.indexOf('Editar') !== -1) {
      btn.onclick = function() { abrirModalEditar(this.getAttribute('data-disciplina-id')); };
    }
  });

  document.querySelectorAll('.btn-excluir').forEach(function(btn) {
    btn.onclick = function() { excluirDisciplina(this.getAttribute('data-disciplina-id')); };
  });
}

// Carrega instituições
function carregarInstituicoes() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/instituicoes', true);
  xhr.onload = function() {
    instituicoes = JSON.parse(xhr.responseText);
    preencherSelectInstituicoes();
  };
  xhr.onerror = function() { alert('Erro ao carregar instituições'); };
  xhr.send();
}

// Preenche select de instituições
function preencherSelectInstituicoes() {
  var select = document.getElementById('selectInstituicao');
  select.innerHTML = '<option value="" selected disabled>Instituições cadastradas</option>';
  instituicoes.forEach(inst => {
    var option = document.createElement('option');
    option.value = inst.id;
    option.textContent = inst.nome;
    select.appendChild(option);
  });
}

// Carrega cursos
function carregarCursos() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/cursos', true);
  xhr.onload = function() { cursos = JSON.parse(xhr.responseText); };
  xhr.onerror = function() { alert('Erro ao carregar cursos'); };
  xhr.send();
}

// Atualiza cursos ao selecionar instituição
function atualizarCursosPorInstituicao(instituicaoId) {
  var selectCurso = document.getElementById('selectCurso');
  selectCurso.innerHTML = '<option value="" selected disabled>Cursos cadastrados</option>';
  cursos.forEach(curso => {
    if (curso.instituicao_id == instituicaoId) {
      var option = document.createElement('option');
      option.value = curso.id;
      option.textContent = curso.nome;
      selectCurso.appendChild(option);
    }
  });
}

// Carrega disciplinas
function carregarDisciplinas() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/disciplinas', true);
  xhr.onload = function() {
    disciplinas = JSON.parse(xhr.responseText);
    exibirDisciplinas();
    setTimeout(adicionarEventosBotoes, 100);
  };
  xhr.onerror = function() { alert('Erro ao carregar disciplinas'); };
  xhr.send();
}

// Exibe disciplinas
function exibirDisciplinas() {
  var container = document.getElementById('listadisciplina');
  container.innerHTML = '';
  var templateInstituicao = document.getElementById('templateInstituicao');
  var templateCurso = document.getElementById('templateCurso');
  var templateDisciplina = document.getElementById('templateDisciplina');

  var instituicaoElement = templateInstituicao.content.cloneNode(true);
  instituicaoElement.querySelector('.nome-instituicao').textContent = 'Todas as Disciplinas';
  var cursosContainer = instituicaoElement.querySelector('.cursos-container');

  var cursoElement = templateCurso.content.cloneNode(true);
  cursoElement.querySelector('.nome-curso').textContent = 'Disciplinas Cadastradas';
  var tbody = cursoElement.querySelector('tbody');

  disciplinas.forEach(disciplina => {
    var disciplinaElement = templateDisciplina.content.cloneNode(true);
    disciplinaElement.querySelector('.codigo').textContent = disciplina.codigo || '-';
    disciplinaElement.querySelector('.nome').textContent = disciplina.nome;
    disciplinaElement.querySelector('.sigla').textContent = disciplina.sigla || '-';
    disciplinaElement.querySelector('.periodo').textContent = disciplina.periodo || '-';
    disciplinaElement.querySelector('.btn-outline-warning').setAttribute('data-disciplina-id', disciplina.id);
    disciplinaElement.querySelector('.btn-excluir').setAttribute('data-disciplina-id', disciplina.id);
    tbody.appendChild(disciplinaElement);
  });

  cursosContainer.appendChild(cursoElement);
  container.appendChild(instituicaoElement);
}

// Criar nova disciplina
function criarDisciplina() {
  var cursoId = document.getElementById('selectCurso').value || '';
  var nome = document.getElementById('inputNovaDisciplina').value.trim();
  var sigla = document.getElementById('inputSiglaDisciplina').value.trim();
  var codigo = document.getElementById('inputCodigoDisciplina').value.trim();
  var periodo = document.getElementById('periodo').value.trim();

  esconderAlertas();
  if (!cursoId || !nome) { mostrarAlerta('alertCampos'); return; }

  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/disciplinas', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    if (resposta.error) { mostrarAlerta('alertCampos'); return; }

    mostrarAlerta('alertSucesso');
    var modal = bootstrap.Modal.getInstance(document.getElementById('modalNovaDisciplina'));
    if (modal) modal.hide();
    document.getElementById('formNovaDisciplina').reset();
    setTimeout(carregarDisciplinas, 500);
  };
  xhr.onerror = function() { mostrarAlerta('alertCampos'); };
  xhr.send(JSON.stringify({ nome, sigla, codigo, periodo, curso_id: Number(cursoId) }));
}

// Abrir modal de edição
function abrirModalEditar(disciplinaId) {
  var disciplina = disciplinas.find(d => d.id == disciplinaId);
  if (!disciplina) return;

  disciplinaEditando = disciplinaId;
  document.getElementById('inputNomeEditar').value = disciplina.nome || '';
  document.getElementById('inputSiglaEditar').value = disciplina.sigla || '';
  document.getElementById('inputCodigoEditar').value = disciplina.codigo || '';
  document.getElementById('inputPeriodoEditar').value = disciplina.periodo || '';
  new bootstrap.Modal(document.getElementById('modalEditarDisciplinas')).show();
}

// Salvar edição
function salvarEdicaoDisciplina() {
  var novoNome = document.getElementById('inputNomeEditar').value.trim();
  var novaSigla = document.getElementById('inputSiglaEditar').value.trim();
  var novoCodigo = document.getElementById('inputCodigoEditar').value.trim();
  var novoPeriodo = document.getElementById('inputPeriodoEditar').value.trim();

  if (!novoNome) { mostrarAlerta('alertCampos'); return; }

  var xhr = new XMLHttpRequest();
  xhr.open('PUT', '/api/disciplinas/' + disciplinaEditando, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    if (resposta.error) { mostrarAlerta('alertCampos'); return; }

    mostrarAlerta('alertSucesso');
    bootstrap.Modal.getInstance(document.getElementById('modalEditarDisciplinas')).hide();
    setTimeout(carregarDisciplinas, 500);
  };
  xhr.onerror = function() { mostrarAlerta('alertCampos'); };
  xhr.send(JSON.stringify({ nome: novoNome, sigla: novaSigla, codigo: novoCodigo, periodo: novoPeriodo }));
}

// Excluir disciplina
function excluirDisciplina(disciplinaId) {
  if (!confirm('Tem certeza que deseja excluir esta disciplina?')) return;

  var xhr = new XMLHttpRequest();
  xhr.open('DELETE', '/api/disciplinas/' + disciplinaId, true);
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    if (resposta.error) { alert('Erro ao excluir disciplina: ' + resposta.error); return; }
    carregarDisciplinas();
  };
  xhr.onerror = function() { alert('Erro ao excluir disciplina'); };
  xhr.send();
}

// Alertas
function esconderAlertas() {
  ['alertDuplicada','alertCampos','alertSucesso'].forEach(id => document.getElementById(id).classList.add('d-none'));
}

function mostrarAlerta(idAlerta) {
  esconderAlertas();
  var alerta = document.getElementById(idAlerta);
  alerta.classList.remove('d-none');
  if (idAlerta === 'alertSucesso') setTimeout(() => alerta.classList.add('d-none'), 3000);
}