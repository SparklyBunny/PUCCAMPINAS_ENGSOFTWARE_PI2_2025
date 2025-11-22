// Autor: Cadu Spadari

window.onload = function() {
  var urlParams = new URLSearchParams(window.location.search);
  var token = urlParams.get('token');

  if (!token) {
    mostrarErro('Token inválido ou ausente.');
    return;
  }

  var form = document.getElementById('formRecuperarSenha');
  form.onsubmit = function(e) {
    e.preventDefault();
    redefinirSenha(token);
  };
};

// Função de redefinição de senha
function redefinirSenha(token) {
  var novaSenha = document.getElementById('inputNovaSenha').value;
  var confirmarSenha = document.getElementById('inputConfirmarSenha').value;
  var alertaErro = document.getElementById('alertErro');
  var alertaCampos = document.getElementById('alertCampos');
  var alertaSucesso = document.getElementById('alertSucesso');
  var botao = document.getElementById('btnRedefinir');

  // Esconde todos os alertas
  [alertaErro, alertaCampos, alertaSucesso].forEach(a => a.classList.add('d-none'));

  if (!novaSenha || !confirmarSenha) { alertaCampos.classList.remove('d-none'); return; }
  if (novaSenha !== confirmarSenha) { mostrarErro('As senhas não coincidem.'); return; }
  if (novaSenha.length < 6) { mostrarErro('A senha deve ter pelo menos 6 caracteres.'); return; }

  botao.disabled = true;
  botao.value = 'Redefinindo...';

  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/auth/redefinir-senha', true);
  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.onload = function() {
    var resposta;
    try { resposta = JSON.parse(xhr.responseText); } 
    catch { mostrarErro('Erro ao processar resposta do servidor.'); resetBotao(botao); return; }

    if (xhr.status >= 200 && xhr.status < 300 && !resposta.error) {
      alertaSucesso.classList.remove('d-none');
      setTimeout(() => window.location.href = '/index.html', 2000);
    } else {
      mostrarErro(resposta?.error || 'Erro ao redefinir senha.');
      resetBotao(botao);
    }
  };

  xhr.onerror = function() {
    mostrarErro('Erro de conexão. Verifique sua internet.');
    resetBotao(botao);
  };

  xhr.send(JSON.stringify({ token, novaSenha }));
}

// Função para exibir erros
function mostrarErro(msg) {
  var alertaErro = document.getElementById('alertErro');
  alertaErro.classList.remove('d-none');
  document.getElementById('mensagemErro').textContent = msg;
}

// Função para reativar botão
function resetBotao(botao) {
  botao.disabled = false;
  botao.value = 'Redefinir Senha';
}