// Autor: Cadu Spadari

// Variáveis globais
var cursos = [];
var instituicoes = [];
var cursoEditando = null;

window.onload = function() {
  carregarInstituicoes();
  carregarCursos();

  // Formulários
  document.getElementById('formNovoCurso').onsubmit = function(e) {
    e.preventDefault();
    criarCurso();
  };

  document.getElementById('formEditarCurso').onsubmit = function(e) {
    e.preventDefault();
    salvarEdicaoCurso();
  };

  setTimeout(adicionarEventosBotoes, 500);
};

// Adiciona eventos aos botões de editar e excluir
function adicionarEventosBotoes() {
  document.querySelectorAll('.btn-outline-warning').forEach(function(btn) {
    if (btn.textContent.indexOf('Editar') !== -1) {
      btn.onclick = function() { abrirModalEditar(this.getAttribute('data-curso-id')); };
    }
  });

  document.querySelectorAll('.btn-excluir').forEach(function(btn) {
    btn.onclick = function() { excluirCurso(this.getAttribute('data-curso-id')); };
  });
}

// Carrega instituições do servidor
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
  var select = document.getElementById('selectCurso');
  select.innerHTML = '<option value="" selected disabled>Instituições cadastradas</option>';
  instituicoes.forEach(function(inst) {
    var option = document.createElement('option');
    option.value = inst.id;
    option.textContent = inst.nome;
    select.appendChild(option);
  });
}

// Carrega cursos do servidor
function carregarCursos() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/cursos', true);
  xhr.onload = function() {
    cursos = JSON.parse(xhr.responseText);
    exibirCursos();
    setTimeout(adicionarEventosBotoes, 100);
  };
  xhr.onerror = function() { alert('Erro ao carregar cursos'); };
  xhr.send();
}

// Exibe cursos agrupados por instituição
function exibirCursos() {
  var container = document.getElementById('listacurso');
  container.innerHTML = '';
  var cursosPorInstituicao = {};

  cursos.forEach(function(curso) {
    if (!cursosPorInstituicao[curso.instituicao_id]) {
      cursosPorInstituicao[curso.instituicao_id] = {
        nome: curso.instituicao_nome,
        cursos: []
      };
    }
    cursosPorInstituicao[curso.instituicao_id].cursos.push(curso);
  });

  var templateInstituicao = document.getElementById('templateInstituicao');
  var templateCurso = document.getElementById('templateCurso');

  for (var id in cursosPorInstituicao) {
    var dados = cursosPorInstituicao[id];
    var instituicaoElement = templateInstituicao.content.cloneNode(true);
    instituicaoElement.querySelector('.nome-instituicao').textContent = dados.nome;
    var cursosContainer = instituicaoElement.querySelector('.cursos-container');

    dados.cursos.forEach(function(curso) {
      var cursoElement = templateCurso.content.cloneNode(true);
      cursoElement.querySelector('.nome-curso').textContent = curso.nome;
      cursoElement.querySelector('.btn-outline-warning').setAttribute('data-curso-id', curso.id);
      cursoElement.querySelector('.btn-excluir').setAttribute('data-curso-id', curso.id);
      cursosContainer.appendChild(cursoElement);
    });

    container.appendChild(instituicaoElement);
  }
}

// Criar novo curso
function criarCurso() {
  var selectInstituicao = document.getElementById('selectCurso');
  var inputNome = document.getElementById('inputNovoCurso');
  var instituicaoId = selectInstituicao.value;
  var nome = inputNome.value.trim();

  esconderAlertas();
  if (!instituicaoId || !nome) { mostrarAlerta('alertCampos'); return; }

  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/cursos', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    if (resposta.error) {
      mostrarAlerta(resposta.error.indexOf('já cadastrado') !== -1 ? 'alertDuplicada' : 'alertCampos');
      return;
    }
    mostrarAlerta('alertSucesso');
    bootstrap.Modal.getInstance(document.getElementById('modalNovoCurso')).hide();
    document.getElementById('formNovoCurso').reset();
    setTimeout(carregarCursos, 500);
  };
  xhr.onerror = function() { mostrarAlerta('alertCampos'); };
  xhr.send(JSON.stringify({ nome: nome, instituicao_id: instituicaoId }));
}

// Abrir modal de edição
function abrirModalEditar(cursoId) {
  var curso = cursos.find(c => c.id == cursoId);
  if (!curso) return;

  cursoEditando = cursoId;
  document.getElementById('inputCursoEditar').value = curso.nome;
  new bootstrap.Modal(document.getElementById('modalEditarCursos')).show();
}

// Salvar edição do curso
function salvarEdicaoCurso() {
  var novoNome = document.getElementById('inputCursoEditar').value.trim();
  if (!novoNome) { mostrarAlerta('alertCampos'); return; }

  var xhr = new XMLHttpRequest();
  xhr.open('PUT', '/api/cursos/' + cursoEditando, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    if (resposta.error) { mostrarAlerta('alertCampos'); return; }

    mostrarAlerta('alertSucesso');
    bootstrap.Modal.getInstance(document.getElementById('modalEditarCursos')).hide();
    setTimeout(carregarCursos, 500);
  };
  xhr.onerror = function() { mostrarAlerta('alertCampos'); };
  xhr.send(JSON.stringify({ nome: novoNome }));
}

// Excluir curso
function excluirCurso(cursoId) {
  if (!confirm('Tem certeza que deseja excluir este curso?')) return;

  var xhr = new XMLHttpRequest();
  xhr.open('DELETE', '/api/cursos/' + cursoId, true);
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    if (resposta.error) { alert('Erro ao excluir curso: ' + resposta.error); return; }
    carregarCursos();
  };
  xhr.onerror = function() { alert('Erro ao excluir curso'); };
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
  if (idAlerta === 'alertSucesso') {
    setTimeout(() => alerta.classList.add('d-none'), 3000);
  }
}