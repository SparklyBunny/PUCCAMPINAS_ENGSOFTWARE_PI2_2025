// Autor: Cadu Spadari

// Variáveis globais
var instituicoes = [];
var instituicaoEditando = null;

window.onload = function() {
  carregarInstituicoes();

  document.getElementById('formNovaInstitucao').onsubmit = function(e) {
    e.preventDefault();
    criarInstituicao();
  };

  document.getElementById('formEditarInstituicao').onsubmit = function(e) {
    e.preventDefault();
    salvarEdicaoInstituicao();
  };

  setTimeout(adicionarEventosBotoes, 500);
};

// Adiciona eventos aos botões
function adicionarEventosBotoes() {
  document.querySelectorAll('.btn-outline-warning').forEach(btn => {
    if (btn.textContent.indexOf('Editar') !== -1) {
      btn.onclick = () => abrirModalEditar(btn.getAttribute('data-instituicao-id'));
    }
  });

  document.querySelectorAll('.btn-excluir').forEach(btn => {
    btn.onclick = () => excluirInstituicao(btn.getAttribute('data-instituicao-id'));
  });
}

// Carrega instituições do servidor
function carregarInstituicoes() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/instituicoes', true);
  xhr.onload = function() {
    instituicoes = JSON.parse(xhr.responseText);
    exibirInstituicoes();
    setTimeout(adicionarEventosBotoes, 100);
  };
  xhr.onerror = () => alert('Erro ao carregar instituições');
  xhr.send();
}

// Exibe instituições na página
function exibirInstituicoes() {
  var container = document.getElementById('listaInstituicoes');
  container.innerHTML = '';
  var template = document.getElementById('templateInstituicao');

  instituicoes.forEach(inst => {
    var elemento = template.content.cloneNode(true);
    elemento.querySelector('.nome-instituicao').textContent = inst.nome;
    elemento.querySelector('.btn-outline-warning').setAttribute('data-instituicao-id', inst.id);
    elemento.querySelector('.btn-excluir').setAttribute('data-instituicao-id', inst.id);
    container.appendChild(elemento);
  });
}

// Criar nova instituição
function criarInstituicao() {
  var nome = document.getElementById('inputNovaInstitucao').value.trim();
  esconderAlertas();
  if (!nome) { mostrarAlerta('alertCampos'); return; }

  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/instituicoes', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    if (resposta.error) {
      if (resposta.error.includes('já cadastrada')) mostrarAlerta('alertDuplicada');
      else mostrarAlerta('alertCampos');
      return;
    }

    mostrarAlerta('alertSucesso');
    bootstrap.Modal.getInstance(document.getElementById('modalNovaInstitucao')).hide();
    document.getElementById('formNovaInstitucao').reset();
    setTimeout(carregarInstituicoes, 500);
  };
  xhr.onerror = () => mostrarAlerta('alertCampos');
  xhr.send(JSON.stringify({ nome }));
}

// Abrir modal de edição
function abrirModalEditar(instituicaoId) {
  var instituicao = instituicoes.find(i => i.id == instituicaoId);
  if (!instituicao) return;
  instituicaoEditando = instituicaoId;
  document.getElementById('inputInstituicaoEditar').value = instituicao.nome;
  new bootstrap.Modal(document.getElementById('modalEditarInstituicao')).show();
}

// Salvar edição
function salvarEdicaoInstituicao() {
  var novoNome = document.getElementById('inputInstituicaoEditar').value.trim();
  if (!novoNome) { mostrarAlerta('alertCampos'); return; }

  var xhr = new XMLHttpRequest();
  xhr.open('PUT', '/api/instituicoes/' + instituicaoEditando, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    if (resposta.error) { mostrarAlerta('alertCampos'); return; }

    mostrarAlerta('alertSucesso');
    bootstrap.Modal.getInstance(document.getElementById('modalEditarInstituicao')).hide();
    setTimeout(carregarInstituicoes, 500);
  };
  xhr.onerror = () => mostrarAlerta('alertCampos');
  xhr.send(JSON.stringify({ nome: novoNome }));
}

// Excluir instituição
function excluirInstituicao(instituicaoId) {
  if (!confirm('Tem certeza que deseja excluir esta instituição? Todos os cursos e turmas associados também serão excluídos.')) return;

  var xhr = new XMLHttpRequest();
  xhr.open('DELETE', '/api/instituicoes/' + instituicaoId, true);
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    if (resposta.error) { alert('Erro ao excluir instituição: ' + resposta.error); return; }
    carregarInstituicoes();
  };
  xhr.onerror = () => alert('Erro ao excluir instituição');
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