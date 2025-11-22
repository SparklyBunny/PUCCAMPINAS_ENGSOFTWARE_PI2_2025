// Autor: Cadu Spadari

window.onload = function() {
  var formLogin = document.getElementById('formLogin');
  formLogin.onsubmit = function(e) {
    e.preventDefault();
    fazerLogin();
  };

  // Esqueci senha
  var formEsqueciSenha = document.getElementById('formEsqueciSenha');
  formEsqueciSenha.onsubmit = function(e) {
    e.preventDefault();
    recuperarSenha();
  };
};

// Função de login
function fazerLogin() {
  var email = document.getElementById('inputEmailLogin').value.trim();
  var senha = document.getElementById('inputPasswordLogin').value;
  var alertaErro = document.querySelector('.alert-danger');
  var alertasAviso = document.querySelectorAll('.alert-warning');

  // Esconde alertas
  alertaErro.classList.add('d-none');
  alertasAviso.forEach(a => a.classList.add('d-none'));

  if (!email || !senha) {
    alertasAviso[1].classList.remove('d-none'); // alerta de campos obrigatórios
    return;
  }

  var botao = document.getElementById('btnEntrar');
  botao.disabled = true;
  botao.value = 'Entrando...';

  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/auth/login', true);
  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    if (xhr.status >= 200 && xhr.status < 300 && !resposta.error) {
      localStorage.setItem('usuario', JSON.stringify(resposta));
      window.location.href = '/pages/home.html';
    } else {
      alertaErro.classList.remove('d-none');
      botao.disabled = false;
      botao.value = 'Entrar';
    }
  };

  xhr.onerror = function() {
    alertaErro.classList.remove('d-none');
    botao.disabled = false;
    botao.value = 'Entrar';
  };

  xhr.send(JSON.stringify({ email, senha }));
}

// Função de recuperação de senha
function recuperarSenha() {
  var form = document.getElementById('formEsqueciSenha');
  var email = document.getElementById('inputEmailRecuperacao').value.trim();
  if (!email) { alert('Digite um e-mail válido'); return; }

  var botao = form.querySelector('button[type="submit"]');
  botao.disabled = true;
  botao.textContent = 'Enviando...';

  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/auth/esqueci-senha', true);
  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.onload = function() {
    var resposta;
    try { resposta = JSON.parse(xhr.responseText); } 
    catch { alert('Erro ao processar resposta'); resetBotao(botao); return; }

    if (xhr.status >= 200 && xhr.status < 300 && !resposta.error) {
      bootstrap.Modal.getInstance(document.getElementById('modalEsqueciSenha')).hide();
      new bootstrap.Modal(document.getElementById('modalConfirmacaoEnvio')).show();
      form.reset();
    } else {
      alert(resposta?.error || 'Erro ao enviar e-mail de recuperação');
      resetBotao(botao);
    }
  };

  xhr.onerror = function() {
    alert('Erro de conexão. Verifique sua internet.');
    resetBotao(botao);
  };

  xhr.send(JSON.stringify({ email }));
}

// Reativa botão
function resetBotao(botao) {
  botao.disabled = false;
  botao.textContent = 'Enviar Link';
}