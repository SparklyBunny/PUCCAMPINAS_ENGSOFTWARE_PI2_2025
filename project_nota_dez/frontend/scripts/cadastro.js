// Autor: Cadu Spadari

window.onload = function() {
  // Formulário de cadastro
  var formulario = document.getElementById('formCadastro');
  
  formulario.onsubmit = function(evento) {
    evento.preventDefault();
    
    // Valores digitados
    var nome = document.getElementById('inputNomeCadastro').value.trim();
    var email = document.getElementById('inputEmailCadastro').value.trim();
    var telefone = document.getElementById('inputTelCadastro').value.trim();
    var senha = document.getElementById('inputPasswordCadastro').value;
    
    // Elementos de alerta
    var alertaErro = document.querySelector('.alert-danger');
    var alertasAviso = document.querySelectorAll('.alert-warning');
    var alertaSucesso = document.getElementById('sucessoCadastro');
    
    // Esconde todos os alertas
    alertaErro.classList.add('d-none');
    alertasAviso.forEach(function(alerta) { alerta.classList.add('d-none'); });
    alertaSucesso.classList.add('d-none');
    
    if (nome === '' || email === '' || senha === '') {
      alertasAviso[1].classList.remove('d-none');
      return;
    }
    
    // Desabilita o botão
    var botao = document.getElementById('btnCadastrar');
    botao.disabled = true;
    botao.value = 'Cadastrando...';
    
    // Requisição HTTP POST
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/auth/cadastro', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onload = function() {
      var resposta = null;
      try {
        resposta = JSON.parse(xhr.responseText);
      } catch (e) {
        alertaErro.classList.remove('d-none');
        botao.disabled = false;
        botao.value = 'Cadastrar';
        return;
      }
      
      // Status de sucesso
      if (xhr.status >= 200 && xhr.status < 300) {
        if (resposta.error) {
          if (resposta.error.indexOf('já cadastrado') !== -1) {
            alertasAviso[0].classList.remove('d-none');
          } else {
            alertaErro.classList.remove('d-none');
          }
          botao.disabled = false;
          botao.value = 'Cadastrar';
        } else {
          alertaSucesso.classList.remove('d-none');
          setTimeout(function() {
            window.location.href = '/index.html';
          }, 2000);
        }
      } else {
        // Status de erro
        if (resposta && resposta.error) {
          if (resposta.error.indexOf('já cadastrado') !== -1) {
            alertasAviso[0].classList.remove('d-none');
          } else {
            alertaErro.classList.remove('d-none');
          }
        } else {
          alertaErro.classList.remove('d-none');
        }
        botao.disabled = false;
        botao.value = 'Cadastrar';
      }
    };
    
    // Erro de rede
    xhr.onerror = function() {
      alertaErro.classList.remove('d-none');
      botao.disabled = false;
      botao.value = 'Cadastrar';
    };
    
    // Enviar dados
    var dados = {
      nome: nome,
      email: email,
      telefone: telefone || null,
      senha: senha
    };
    
    xhr.send(JSON.stringify(dados));
  };
};