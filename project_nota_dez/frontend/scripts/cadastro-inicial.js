// Autor: Cadu Spadari

window.onload = function() {
  // Usuário salvo no login
  var usuarioSalvo = localStorage.getItem('usuario');
  if (usuarioSalvo) {
    var usuario = JSON.parse(usuarioSalvo);
    var alertaBemVindo = document.querySelector('.alert-success');
    if (alertaBemVindo) {
      alertaBemVindo.innerHTML = '<div><strong>Seja bem-vindo(a), ' + usuario.nome + '!</strong></div>';
    }
  }

  // Formulário de cadastro inicial
  var formulario = document.getElementById('formCadastroInicial');
  
  formulario.onsubmit = function(evento) {
    evento.preventDefault();
    
    // Valores digitados
    var nomeInstituicao = document.getElementById('inputNomeLugar').value.trim();
    var nomeCurso = document.getElementById('inputCurso').value.trim();
    
    // Elementos de alerta
    var alertaErro = document.querySelector('.alert-danger');
    var alertasAviso = document.querySelectorAll('.alert-warning');
    
    // Esconde todos os alertas
    alertaErro.classList.add('d-none');
    alertasAviso.forEach(function(alerta) {
      alerta.classList.add('d-none');
    });
    
    // Verifica campos obrigatórios
    if (nomeInstituicao === '' || nomeCurso === '') {
      alertasAviso[0].classList.remove('d-none');
      return;
    }
    
    // Valida caracteres
    var regex = /^[a-zA-ZÀ-ÿ\s\-]+$/;
    if (!regex.test(nomeInstituicao) || !regex.test(nomeCurso)) {
      alertasAviso[1].classList.remove('d-none');
      return;
    }
    
    // Desabilita o botão
    var botao = document.getElementById('btnSalvarContinuar');
    botao.disabled = true;
    botao.value = 'Salvando...';
    
    // Cria requisição HTTP POST
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/cadastro-inicial', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onload = function() {
      var resposta = JSON.parse(xhr.responseText);
      if (resposta.error) {
        alertaErro.classList.remove('d-none');
        botao.disabled = false;
        botao.value = 'Salvar e Continuar';
      } else {
        window.location.href = '/pages/home.html';
      }
    };
    
    // Erro de rede
    xhr.onerror = function() {
      alertaErro.classList.remove('d-none');
      botao.disabled = false;
      botao.value = 'Salvar e Continuar';
    };
    
    // JSON
    var dados = {
      nome_instituicao: nomeInstituicao,
      nome_curso: nomeCurso
    };
    
    xhr.send(JSON.stringify(dados));
  };
};