// Autor: Cadu Spadari
// Script para gerenciar turmas (listar, criar, editar, excluir, alunos, disciplinas)

// Variáveis globais para armazenar dados
var turmas = [];
var instituicoes = [];
var cursos = [];
var disciplinas = [];
var turmaEditando = null;
var turmaAtualAlunos = null; // Armazena o ID da turma que está com o modal de alunos aberto
var alunoEditando = null; // Armazena o ID do aluno que está sendo editado

// Quando a página terminar de carregar, executa este código
window.onload = function() {
  // Carrega os dados quando a página carrega
  carregarInstituicoes();
  carregarCursos();
  carregarDisciplinas();
  carregarTurmas();

  // Pega o formulário de nova turma
  var formNovaTurma = document.getElementById('formNovaTurma');
  formNovaTurma.onsubmit = function(e) {
    e.preventDefault();
    criarTurma();
  };

  // Pega o formulário de editar turma
  var formEditarTurma = document.getElementById('formEditarTurma');
  formEditarTurma.onsubmit = function(e) {
    e.preventDefault();
    salvarEdicaoTurma();
  };

  // Pega o formulário de editar aluno (já existente no HTML)
  var formEditarAluno = document.getElementById('formEditarAluno');
  if (formEditarAluno) {
    formEditarAluno.onsubmit = function(e) {
      e.preventDefault();
      salvarEdicaoAluno();
    };
  }

  // Pega o formulário de adicionar aluno manualmente (NOVO)
  var formAdicionarAlunoManual = document.getElementById('formAdicionarAlunoManual');
  if (formAdicionarAlunoManual) {
    formAdicionarAlunoManual.onsubmit = function(e) {
      e.preventDefault();
      // O ID da turma será pego do turmaAtualAlunos dentro da função, mas 
      // para melhor coesão, o evento de submit é adicionado em abrirModalAlunos.
    };
  }

  // Pega o formulário de importar alunos (NOVO)
  var formImportarAlunos = document.getElementById('formImportarAlunos');
  if (formImportarAlunos) {
    formImportarAlunos.onsubmit = function(e) {
      e.preventDefault();
      // O ID da turma será pego do turmaAtualAlunos dentro da função, mas 
      // para melhor coesão, o evento de submit é adicionado em abrirModalAlunos.
    };
  }

  // Adiciona eventos para os botões depois que a página carregar
  setTimeout(function() {
    adicionarEventosBotoes();
  }, 500);
};

// Função para adicionar eventos aos botões
function adicionarEventosBotoes() {
  // Pega todos os botões de editar turma
  var botoesEditar = document.querySelectorAll('.btn-outline-warning');
  for (var i = 0; i < botoesEditar.length; i++) {
    var btn = botoesEditar[i];
    if (btn.textContent.indexOf('Editar') !== -1 && btn.getAttribute('data-turma-id')) {
      btn.onclick = function() {
        var turmaId = this.getAttribute('data-turma-id');
        abrirModalEditar(turmaId);
      };
    }
  }
  
  // Pega todos os botões de excluir turma
  var botoesExcluir = document.querySelectorAll('.btn-excluir');
  for (var i = 0; i < botoesExcluir.length; i++) {
    var btn = botoesExcluir[i];
    if (btn.getAttribute('data-turma-id')) {
      btn.onclick = function() {
        var turmaId = this.getAttribute('data-turma-id');
        excluirTurma(turmaId);
      };
    }
  }

  // Pega todos os botões de ver alunos
  var botoesAlunos = document.querySelectorAll('.btn-outline-info');
  for (var i = 0; i < botoesAlunos.length; i++) {
    var btn = botoesAlunos[i];
    if (btn.textContent.indexOf('Alunos') !== -1 && btn.getAttribute('data-turma-id')) {
      btn.onclick = function() {
        var turmaId = this.getAttribute('data-turma-id');
        abrirModalAlunos(turmaId);
      };
    }
  }

  // Pega todos os botões de ver disciplinas
  var botoesDisciplinas = document.querySelectorAll('.btn-outline-secondary');
  for (var i = 0; i < botoesDisciplinas.length; i++) {
    var btn = botoesDisciplinas[i];
    if (btn.textContent.indexOf('Disciplinas') !== -1 && btn.getAttribute('data-turma-id')) {
      btn.onclick = function() {
        var turmaId = this.getAttribute('data-turma-id');
        abrirModalDisciplinas(turmaId);
      };
    }
  }

  // Os eventos dos botões de editar/excluir aluno são adicionados dinamicamente em carregarAlunosTurma.
}

// Funções para carregar dados (Instituições, Cursos, Disciplinas) - INALTERADAS
function carregarInstituicoes() {
  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método GET para a URL /api/instituicoes
  xhr.open('GET', '/api/instituicoes', true);
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    // Converte a resposta para um objeto JavaScript
    var resposta = JSON.parse(xhr.responseText);
    // Salva as instituições na variável global
    instituicoes = resposta;
    // Preenche o select de instituições
    preencherSelectInstituicoes();
  };
  
  // Se acontecer algum erro de rede
  xhr.onerror = function() {
    alert('Erro ao carregar instituições');
  };
  
  // Envia a requisição
  xhr.send();
}
function preencherSelectInstituicoes() {
  var select = document.getElementById('selectInstituicao');
  select.innerHTML = '<option value="" selected disabled>Instituições cadastradas</option>';
  
  for (var i = 0; i < instituicoes.length; i++) {
    var option = document.createElement('option');
    option.value = instituicoes[i].id;
    option.textContent = instituicoes[i].nome;
    select.appendChild(option);
  }

  // Quando selecionar uma instituição, atualiza os cursos
  select.onchange = function() {
    atualizarCursosPorInstituicao(this.value);
  };
}
function atualizarCursosPorInstituicao(instituicaoId) {
  var selectCurso = document.getElementById('selectCurso');
  selectCurso.innerHTML = '<option value="" selected disabled>Cursos cadastrados</option>';
  
  for (var i = 0; i < cursos.length; i++) {
    if (cursos[i].instituicao_id == instituicaoId) {
      var option = document.createElement('option');
      option.value = cursos[i].id;
      option.textContent = cursos[i].nome;
      selectCurso.appendChild(option);
    }
  }
}

function carregarCursos() {
  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método GET para a URL /api/cursos
  xhr.open('GET', '/api/cursos', true);
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    // Converte a resposta para um objeto JavaScript
    var resposta = JSON.parse(xhr.responseText);
    // Salva os cursos na variável global
    cursos = resposta;
  };
  
  // Se acontecer algum erro de rede
  xhr.onerror = function() {
    alert('Erro ao carregar cursos');
  };
  
  // Envia a requisição
  xhr.send();
}
function carregarDisciplinas() {
  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método GET para a URL /api/disciplinas
  xhr.open('GET', '/api/disciplinas', true);
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    // Converte a resposta para um objeto JavaScript
    var resposta = JSON.parse(xhr.responseText);
    // Salva as disciplinas na variável global
    disciplinas = resposta;
    // Preenche os checkboxes de disciplinas
    preencherCheckboxesDisciplinas();
  };
  
  // Se acontecer algum erro de rede
  xhr.onerror = function() {
    alert('Erro ao carregar disciplinas');
  };
  
  // Envia a requisição
  xhr.send();
}
function preencherCheckboxesDisciplinas() {
  var container = document.getElementById('disciplinasContainer');
  container.innerHTML = '';
  
  for (var i = 0; i < disciplinas.length; i++) {
    var div = document.createElement('div');
    div.className = 'form-check';
    
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'form-check-input';
    input.id = 'disciplina-' + disciplinas[i].id;
    input.value = disciplinas[i].id;
    
    var label = document.createElement('label');
    label.className = 'form-check-label';
    label.htmlFor = 'disciplina-' + disciplinas[i].id;
    label.textContent = disciplinas[i].nome;
    
    div.appendChild(input);
    div.appendChild(label);
    container.appendChild(div);
  }
}
function carregarTurmas() {
  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método GET para a URL /api/turmas
  xhr.open('GET', '/api/turmas', true);
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    // Converte a resposta para um objeto JavaScript
    var resposta = JSON.parse(xhr.responseText);
    // Salva as turmas na variável global
    turmas = resposta;
    // Exibe as turmas na página
    exibirTurmas();
    // Adiciona eventos aos botões novamente
    setTimeout(function() {
      adicionarEventosBotoes();
    }, 100);
  };
  
  // Se acontecer algum erro de rede
  xhr.onerror = function() {
    alert('Erro ao carregar turmas');
  };
  
  // Envia a requisição
  xhr.send();
}
function exibirTurmas() {
  var container = document.getElementById('listaturmas');
  container.innerHTML = '';

  // Agrupa turmas por instituição e curso
  var turmasPorInstituicao = {};
  for (var i = 0; i < turmas.length; i++) {
    var turma = turmas[i];
    var instituicaoId = turma.instituicao_id;
    var cursoId = turma.curso_id;
    
    if (!turmasPorInstituicao[instituicaoId]) {
      turmasPorInstituicao[instituicaoId] = {
        nome: turma.instituicao_nome,
        cursos: {}
      };
    }
    
    if (!turmasPorInstituicao[instituicaoId].cursos[cursoId]) {
      turmasPorInstituicao[instituicaoId].cursos[cursoId] = {
        nome: turma.curso_nome,
        turmas: []
      };
    }
    
    turmasPorInstituicao[instituicaoId].cursos[cursoId].turmas.push(turma);
  }

  // Pega os templates
  var templateInstituicao = document.getElementById('templateInstituicao');
  var templateCurso = document.getElementById('templateCurso');

  // Para cada instituição
  for (var instituicaoId in turmasPorInstituicao) {
    var dadosInst = turmasPorInstituicao[instituicaoId];
    
    // Clona o template de instituição
    var instituicaoElement = templateInstituicao.content.cloneNode(true);
    instituicaoElement.querySelector('.nome-instituicao').textContent = dadosInst.nome;
    var cursosContainer = instituicaoElement.querySelector('.cursos-container');

    // Para cada curso
    for (var cursoId in dadosInst.cursos) {
      var dadosCurso = dadosInst.cursos[cursoId];
      
      // Clona o template de curso
      var cursoElement = templateCurso.content.cloneNode(true);
      cursoElement.querySelector('.nome-curso').textContent = dadosCurso.nome;
      var turmasList = cursoElement.querySelector('.lista-turmas');
      
      // Para cada turma
      for (var j = 0; j < dadosCurso.turmas.length; j++) {
        var turma = dadosCurso.turmas[j];
        
        // Cria um item de lista para a turma
        var li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = '<span class="turma-nome">' + turma.nome + '</span>' +
          '<div class="acoes">' +
          '<button type="button" class="btn btn-outline-info btn-sm btn-disciplinas m-1" data-turma-id="' + turma.id + '">' +
          '<i class="bi bi-book"></i> Alunos</button>' +
          '<button type="button" class="btn btn-outline-secondary btn-sm btn-disciplinas m-1" data-turma-id="' + turma.id + '">' +
          '<i class="bi bi-book"></i> Disciplinas Associadas</button>' +
          '<button type="button" class="btn btn-outline-warning btn-sm m-1" data-turma-id="' + turma.id + '">' +
          '<i class="bi bi-pencil-square"></i> Editar</button>' +
          '<button type="button" class="btn btn-outline-danger btn-sm btn-excluir m-1" data-turma-id="' + turma.id + '">' +
          '<i class="bi bi-trash"></i> Excluir</button>' +
          '</div>';
        
        turmasList.appendChild(li);
      }
      
      cursosContainer.appendChild(cursoElement);
    }

    container.appendChild(instituicaoElement);
  }
}
function criarTurma() {
  var selectInstituicao = document.getElementById('selectInstituicao');
  var selectCurso = document.getElementById('selectCurso');
  var inputNome = document.getElementById('inputNovaTurma');
  var checkboxes = document.querySelectorAll('#disciplinasContainer input[type="checkbox"]:checked');
  
  var instituicaoId = selectInstituicao.value;
  var cursoId = selectCurso.value;
  var nome = inputNome.value.trim();
  var disciplinaIds = [];
  
  for (var i = 0; i < checkboxes.length; i++) {
    disciplinaIds.push(parseInt(checkboxes[i].value));
  }

  esconderAlertas();

  if (instituicaoId === '' || cursoId === '' || nome === '') {
    mostrarAlerta('alertCampos');
    return;
  }

  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método POST para criar
  xhr.open('POST', '/api/turmas', true);
  
  // Define que vamos enviar dados em formato JSON
  xhr.setRequestHeader('Content-Type', 'application/json');
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    
    if (resposta.error) {
      if (resposta.error.indexOf('já cadastrada') !== -1) {
        mostrarAlerta('alertDuplicada');
      } else {
        mostrarAlerta('alertCampos');
      }
      return;
    }

    mostrarAlerta('alertSucessoCadastro');
    
    var modal = bootstrap.Modal.getInstance(document.getElementById('modalNovaTurma'));
    modal.hide();
    
    document.getElementById('formNovaTurma').reset();
    
    setTimeout(function() {
      carregarTurmas();
    }, 500);
  };
  
  xhr.onerror = function() {
    mostrarAlerta('alertCampos');
  };
  
  // Prepara os dados para enviar
  var dados = {
    nome: nome,
    curso_id: cursoId,
    disciplina_ids: disciplinaIds
  };
  
  // Envia a requisição
  xhr.send(JSON.stringify(dados));
}
function abrirModalEditar(turmaId) {
  var turma = null;
  for (var i = 0; i < turmas.length; i++) {
    if (turmas[i].id == turmaId) {
      turma = turmas[i];
      break;
    }
  }

  if (!turma) return;

  turmaEditando = turmaId;
  document.getElementById('inputNovaTurmaEditar').value = turma.nome;
  
  var modal = new bootstrap.Modal(document.getElementById('modalEditarTurma'));
  modal.show();
}
function salvarEdicaoTurma() {
  var novoNome = document.getElementById('inputNovaTurmaEditar').value.trim();

  if (novoNome === '') {
    mostrarAlerta('alertCampos');
    return;
  }

  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método PUT para atualizar
  xhr.open('PUT', '/api/turmas/' + turmaEditando, true);
  
  // Define que vamos enviar dados em formato JSON
  xhr.setRequestHeader('Content-Type', 'application/json');
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    
    if (resposta.error) {
      mostrarAlerta('alertCampos');
      return;
    }

    mostrarAlerta('alertSucessoEdicao');
    
    var modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarTurma'));
    modal.hide();
    
    setTimeout(function() {
      carregarTurmas();
    }, 500);
  };
  
  xhr.onerror = function() {
    mostrarAlerta('alertCampos');
  };
  
  // Prepara os dados para enviar
  var dados = { nome: novoNome };
  
  // Envia a requisição
  xhr.send(JSON.stringify(dados));
}
function excluirTurma(turmaId) {
  if (!confirm('Tem certeza que deseja excluir esta turma?')) {
    return;
  }

  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método DELETE para excluir
  xhr.open('DELETE', '/api/turmas/' + turmaId, true);
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    
    if (resposta.error) {
      alert('Erro ao excluir turma: ' + resposta.error);
      return;
    }

    mostrarAlerta('alertSucessoExclusao');
    carregarTurmas();
  };
  
  xhr.onerror = function() {
    alert('Erro ao excluir turma');
  };
  
  // Envia a requisição
  xhr.send();
}

function abrirModalDisciplinas(turmaId) {
  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método GET para buscar disciplinas da turma
  xhr.open('GET', '/api/turmas/' + turmaId + '/disciplinas', true);
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    var lista = document.getElementById('vd-lista-disciplinas');
    lista.innerHTML = '';
    
    // Encontra o nome da turma
    var turma = null;
    for (var i = 0; i < turmas.length; i++) {
      if (turmas[i].id == turmaId) {
        turma = turmas[i];
        break;
      }
    }
    
    if (turma) {
      document.getElementById('vd-turma-nome').textContent = turma.nome;
    }
    
    if (resposta.length === 0) {
      document.getElementById('vd-empty').classList.remove('d-none');
    } else {
      document.getElementById('vd-empty').classList.add('d-none');
      
      for (var i = 0; i < resposta.length; i++) {
        var disciplina = resposta[i];
        var li = document.createElement('li');
        li.className = 'list-group-item';
        li.textContent = disciplina.nome;
        lista.appendChild(li);
      }
    }
    
    var modal = new bootstrap.Modal(document.getElementById('modalVerDisciplinas'));
    modal.show();
  };
  
  xhr.onerror = function() {
    alert('Erro ao carregar disciplinas');
  };
  
  // Envia a requisição
  xhr.send();
}
// FIM DAS FUNÇÕES INALTERADAS

// FUNÇÃO ADAPTADA: abre modal de alunos e configura novos botões
function abrirModalAlunos(turmaId) {
  turmaAtualAlunos = turmaId;
  
  // Encontra a turma para exibir o nome
  var turma = turmas.find(t => t.id == turmaId);
  if (turma) {
      document.getElementById('va-turma-nome').textContent = turma.nome;
  }

  // É importante que os botões de adicionar apontem para a turma correta
  var btnAdicionarAlunoManual = document.getElementById('btnAdicionarAlunoManual');
  var btnAdicionarAlunoImportar = document.getElementById('btnAdicionarAlunoImportar');

  if (btnAdicionarAlunoManual) {
    // CORREÇÃO: No novo HTML, o target deste botão deve ser #modalAdicionarAlunoManual
    btnAdicionarAlunoManual.setAttribute('data-bs-target', '#modalAdicionarAlunoManual');
    btnAdicionarAlunoManual.setAttribute('data-turma-id', turmaId);
  }

  if (btnAdicionarAlunoImportar) {
    btnAdicionarAlunoImportar.setAttribute('data-turma-id', turmaId);
  }

  // Adiciona evento de submit para o formulário de importação (do HTML novo)
  var formImportarAlunos = document.getElementById('formImportarAlunos');
  if (formImportarAlunos) {
    // Remove o evento anterior se houver
    formImportarAlunos.onsubmit = function(e) {
      e.preventDefault();
      importarAlunosCSV(turmaId); // Passa o ID da turma
    };
  }
  
  // Adiciona evento de submit para o novo formulário manual (que foi adicionado)
  var formAdicionarAlunoManual = document.getElementById('formAdicionarAlunoManual');
  if (formAdicionarAlunoManual) {
    // Remove o evento anterior se houver
    formAdicionarAlunoManual.onsubmit = function(e) {
      e.preventDefault();
      adicionarAlunoManualmente(turmaId); // Passa o ID da turma
    };
  }

  carregarAlunosTurma(turmaId);
  var modal = new bootstrap.Modal(document.getElementById('modalVerAlunos'));
  modal.show();
}

// FUNÇÃO ADAPTADA: carregar alunos da turma (agora usa o TEMPLATE do HTML novo)
function carregarAlunosTurma(turmaId) {
  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método GET para buscar alunos da turma
  xhr.open('GET', '/api/turmas/' + turmaId + '/alunos', true);
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    var lista = document.getElementById('va-lista-alunos');
    lista.innerHTML = '';
    
    // Pega o template do HTML novo
    var template = document.getElementById('templateAlunosModal');
    // Verifica se o template existe (segurança)
    if (!template) {
        alert('Erro: Template de aluno não encontrado. Verifique o HTML.');
        return;
    }
    // Clona o li/item de lista dentro do template
    var modeloLi = template.content.querySelector('.modelo-aluno-modal');

    if (resposta.length === 0) {
      document.getElementById('va-empty').classList.remove('d-none');
    } else {
      document.getElementById('va-empty').classList.add('d-none');
      for (var i = 0; i < resposta.length; i++) {
        var aluno = resposta[i];
        
        // Clona o template do aluno
        var li = modeloLi.cloneNode(true); 
        
        // Preenche os dados
        li.querySelector('.aluno-nome').textContent = aluno.nome;
        li.querySelector('.aluno-matricula').textContent = 'ID: ' + aluno.identificador;
        
        // Configura os botões de ação dinamicamente
        var btnEditar = li.querySelector('.btn-editar-aluno');
        btnEditar.setAttribute('data-aluno-id', aluno.id);
        btnEditar.onclick = function() {
            var alunoId = this.getAttribute('data-aluno-id');
            abrirModalEditarAluno(alunoId);
        };

        var btnExcluir = li.querySelector('.btn-excluir-aluno');
        btnExcluir.setAttribute('data-aluno-id', aluno.id);
        btnExcluir.onclick = function() {
            var alunoId = this.getAttribute('data-aluno-id');
            excluirAluno(alunoId);
        };
        
        lista.appendChild(li);
      }
    }
  };
  
  // Se acontecer algum erro de rede
  xhr.onerror = function() {
    alert('Erro ao carregar alunos');
  };
  
  // Envia a requisição
  xhr.send();
}

// NOVA FUNÇÃO: adicionar aluno manualmente (POST /api/alunos)
function adicionarAlunoManualmente(turmaId) {
    var identificador = document.getElementById('manualAlunoId').value.trim();
    var nome = document.getElementById('manualAlunoNome').value.trim();
    
    if (identificador === '' || nome === '') {
        mostrarAlerta('alertCampos');
        return;
    }

    // Cria o objeto de dados
    var dados = {
        identificador: identificador, 
        nome: nome,
        turma_id: turmaId // Envia o ID da turma
    };

    // Cria um objeto para fazer requisição HTTP
    var xhr = new XMLHttpRequest();

    // Configura a requisição: método POST para criar um aluno
    xhr.open('POST', '/api/alunos', true);
    // Define que vamos enviar dados em formato JSON
    xhr.setRequestHeader('Content-Type', 'application/json');

    // Quando a requisição terminar, executa esta função
xhr.onload = function() {
        var resposta = JSON.parse(xhr.responseText);
        
        if (resposta.error) {
            alert('Erro ao cadastrar aluno: ' + resposta.error);
            return;
        }
        
        // Limpa o formulário e fecha o modal (MANTER)
        document.getElementById('formAdicionarAlunoManual').reset();
        
        // Exibe o alerta de sucesso
        mostrarAlerta('alertSucessoAluno');
        
        // CORREÇÃO ESSENCIAL: Recarrega a lista de alunos após a adição bem-sucedida.
        // Se a matrícula foi bem-sucedida, a lista deve ser atualizada.
        carregarAlunosTurma(turmaId);
        
        // Fechar o modal aqui (se necessário, dependendo da sua implementação)
        // var modal = bootstrap.Modal.getInstance(document.getElementById('modalAdicionarAlunoManual'));
        // if (modal) modal.hide();
    };

    xhr.onerror = function() {
        alert('Erro de rede ao cadastrar aluno.');
    };

    // Envia a requisição
    xhr.send(JSON.stringify(dados));
}

// FUNÇÃO ADAPTADA: importar alunos via CSV (POST /api/alunos/importar)
function importarAlunosCSV(turmaId) {
    var inputFile = document.getElementById('inputCsvAlunos');
    var file = inputFile.files[0];
    
    if (!file) {
        alert('Selecione um arquivo CSV');
        return;
    }
    
    // Lê o arquivo CSV
    var reader = new FileReader();
    reader.onload = function(e) {
        var texto = e.target.result;
        var linhas = texto.split('\n');
        var alunos = [];
        
        // Processa cada linha do CSV
        for (var i = 0; i < linhas.length; i++) {
            var linha = linhas[i].trim();
            if (linha === '') continue; // Pula linhas vazias

            // Divide a linha por vírgula ou ponto e vírgula
            var colunas = linha.split(/[,;]/); 

            // Coluna 1: Identificador, Coluna 2: Nome
            if (colunas.length >= 2) { 
                alunos.push({ 
                    identificador: colunas[0].trim(), 
                    nome: colunas[1].trim() 
                });
            }
        }
        
        if (alunos.length === 0) {
            alert('Nenhum aluno válido encontrado no arquivo CSV');
            return;
        }

        // Cria o objeto de dados para envio
        var dados = {
            turma_id: turmaId, // Envia o ID da turma
            alunos: alunos
        };

        // Cria um objeto para fazer requisição HTTP
        var xhr = new XMLHttpRequest();
        
        // Configura a requisição: método POST para importar alunos
        // A API de importação deve receber o ID da turma para matricular.
        xhr.open('POST', '/api/alunos/importar', true); 
        
        // Define que vamos enviar dados em formato JSON
        xhr.setRequestHeader('Content-Type', 'application/json'); 
        
        // Quando a requisição terminar, executa esta função
        xhr.onload = function() {
            var resposta = JSON.parse(xhr.responseText);

            if (resposta.error) {
                alert('Erro ao importar alunos: ' + resposta.error);
                return;
            }
            
            // Limpa o formulário
            document.getElementById('formImportarAlunos').reset();

            // Fecha o modal
            var modal = bootstrap.Modal.getInstance(document.getElementById('modalImportarAlunos'));
            if (modal) modal.hide();
            
            mostrarAlerta('alertSucessoAluno'); // Alerta de sucesso
            
            // Recarrega os alunos
            carregarAlunosTurma(turmaId);
        };
        
        xhr.onerror = function() {
            alert('Erro de rede ao importar alunos');
        };

        // Envia a requisição
        xhr.send(JSON.stringify(dados));
    };

    // Lê o arquivo como texto
    reader.readAsText(file);
}

// Funções de edição/exclusão de aluno (baseado no original)
// As funções abaixo assumem que existem endpoints /api/alunos (POST, PUT, DELETE)

function abrirModalEditarAluno(alunoId) {
    alunoEditando = alunoId;
    // Tenta encontrar o aluno na lista atual da turma
    var aluno = null;
    var listaAlunos = document.getElementById('va-lista-alunos').querySelectorAll('li');
    // Não temos o array global de alunos, então teríamos que fazer uma nova requisição
    // Para simplificar, vamos assumir uma requisição GET para pegar os dados do aluno
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/alunos/' + alunoId, true);
    xhr.onload = function() {
        var resposta = JSON.parse(xhr.responseText);
        if (resposta.error) {
            alert('Erro ao buscar dados do aluno: ' + resposta.error);
            return;
        }
        
        document.getElementById('editarAlunoId').value = resposta.identificador;
        document.getElementById('editarAlunoNome').value = resposta.nome;
        
        var modal = new bootstrap.Modal(document.getElementById('modalEditarAluno'));
        modal.show();
    };
    xhr.send();
}

function salvarEdicaoAluno() {
  var identificador = document.getElementById('editarAlunoId').value.trim();
  var nome = document.getElementById('editarAlunoNome').value.trim();
  
  if (identificador === '' || nome === '') {
    mostrarAlerta('alertCampos');
    return;
  }
  
  var dados = { identificador: identificador, nome: nome };
  
  var xhr = new XMLHttpRequest();
  xhr.open('PUT', '/api/alunos/' + alunoEditando, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    
    if (resposta.error) {
      alert('Erro ao editar aluno: ' + resposta.error);
      return;
    }
    
    var modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarAluno'));
    if (modal) modal.hide();
    
    mostrarAlerta('alertSucessoEdicao');
    
    // Recarrega os alunos
    if (turmaAtualAlunos) {
      carregarAlunosTurma(turmaAtualAlunos);
    }
  };
  
  xhr.onerror = function() {
    alert('Erro de rede ao salvar edição do aluno');
  };
  
  xhr.send(JSON.stringify(dados));
}

function excluirAluno(alunoId) {
  if (!confirm('Tem certeza que deseja excluir este aluno? Ele será removido apenas desta turma.')) {
    return;
  }

  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método DELETE para excluir (endpoint de desmatricular)
  // Assumimos um endpoint para desmatricular o aluno da turma atual
  xhr.open('DELETE', '/api/alunos/' + alunoId, true);
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    
    if (resposta.error) {
      alert('Erro ao excluir aluno: ' + resposta.error);
      return;
    }

    mostrarAlerta('alertSucessoExclusao');

    // Recarrega os alunos
    if (turmaAtualAlunos) {
      carregarAlunosTurma(turmaAtualAlunos);
    }
  };
  
  xhr.onerror = function() {
    alert('Erro ao excluir aluno');
  };
  
  // Envia a requisição
  xhr.send();
}

// Funções auxiliares para alertas - INALTERADAS
function esconderAlertas() {
  var alertas = ['alertDuplicada', 'alertCampos', 'alertSucessoCadastro', 'alertSucessoExclusao', 'alertSucessoEdicao', 'alertSucessoAluno'];
  for (var i = 0; i < alertas.length; i++) {
    var elemento = document.getElementById(alertas[i]);
    if (elemento) {
      elemento.classList.add('d-none');
    }
  }
}

function mostrarAlerta(idAlerta) {
  esconderAlertas();
  var elemento = document.getElementById(idAlerta);
  if (elemento) {
    elemento.classList.remove('d-none');
    if (idAlerta.indexOf('Sucesso') !== -1) {
      setTimeout(function() {
        elemento.classList.add('d-none');
      }, 3000);
    }
  }
}