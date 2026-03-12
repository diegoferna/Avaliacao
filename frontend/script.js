const API_URL = window.location.origin;

const form = document.getElementById('form-avaliacao');
const selectUnidade = document.getElementById('unidade');
const comentario = document.getElementById('comentario');
const charCount = document.getElementById('char-count');
const btnEnviar = document.getElementById('btn-enviar');
const mensagemSucesso = document.getElementById('mensagem-sucesso');
const mensagemErro = document.getElementById('mensagem-erro');
const textoErro = document.getElementById('texto-erro');
const btnNovaAvaliacao = document.getElementById('btn-nova-avaliacao');

const campos = ['acesso', 'integralidade', 'longitudinalidade', 'receptividade', 'atendimento'];

// Carregar unidades de saúde
async function carregarUnidades() {
  try {
    const resp = await fetch(`${API_URL}/unidades`);
    if (!resp.ok) throw new Error('Erro ao carregar unidades');
    const unidades = await resp.json();

    unidades.forEach(u => {
      const option = document.createElement('option');
      option.value = u.id;
      option.textContent = `${u.nome} (${u.tipo} - ${u.distrito})`;
      selectUnidade.appendChild(option);
    });
  } catch (err) {
    mostrarErro('Não foi possível carregar as unidades de saúde. Verifique sua conexão.');
  }
}

// Contador de caracteres
comentario.addEventListener('input', () => {
  charCount.textContent = comentario.value.length;
});

// Validação
function validarFormulario() {
  let valido = true;

  // Validar unidade
  const erroUnidade = document.getElementById('erro-unidade');
  if (!selectUnidade.value) {
    erroUnidade.classList.remove('hidden');
    selectUnidade.classList.add('border-red-400');
    valido = false;
  } else {
    erroUnidade.classList.add('hidden');
    selectUnidade.classList.remove('border-red-400');
  }

  // Validar cada pergunta
  campos.forEach(campo => {
    const pergunta = document.querySelector(`[data-campo="${campo}"]`);
    const selecionado = document.querySelector(`input[name="${campo}"]:checked`);
    const erroCampo = pergunta.querySelector('.erro-campo');

    if (!selecionado) {
      pergunta.classList.add('erro');
      erroCampo.classList.remove('hidden');
      valido = false;
    } else {
      pergunta.classList.remove('erro');
      erroCampo.classList.add('hidden');
    }
  });

  return valido;
}

// Limpar erros ao interagir
selectUnidade.addEventListener('change', () => {
  document.getElementById('erro-unidade').classList.add('hidden');
  selectUnidade.classList.remove('border-red-400');
});

campos.forEach(campo => {
  document.querySelectorAll(`input[name="${campo}"]`).forEach(radio => {
    radio.addEventListener('change', () => {
      const pergunta = document.querySelector(`[data-campo="${campo}"]`);
      pergunta.classList.remove('erro');
      pergunta.querySelector('.erro-campo').classList.add('hidden');
    });
  });
});

// Enviar avaliação
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  esconderMensagens();

  if (!validarFormulario()) {
    // Scroll para o primeiro erro
    const primeiroErro = document.querySelector('.erro-campo:not(.hidden), #erro-unidade:not(.hidden)');
    if (primeiroErro) {
      primeiroErro.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  const dados = {
    unidade_id: parseInt(selectUnidade.value),
    comentario: comentario.value.trim() || undefined,
  };

  campos.forEach(campo => {
    dados[campo] = parseInt(document.querySelector(`input[name="${campo}"]:checked`).value);
  });

  btnEnviar.classList.add('btn-loading');
  btnEnviar.disabled = true;

  try {
    const resp = await fetch(`${API_URL}/avaliacoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });

    if (!resp.ok) {
      const erro = await resp.json();
      throw new Error(erro.error || 'Erro ao enviar avaliação');
    }

    // Sucesso
    form.classList.add('hidden');
    mensagemSucesso.classList.remove('hidden');
    mensagemSucesso.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    mostrarErro(err.message || 'Erro ao enviar. Tente novamente.');
  } finally {
    btnEnviar.classList.remove('btn-loading');
    btnEnviar.disabled = false;
  }
});

// Nova avaliação
btnNovaAvaliacao.addEventListener('click', () => {
  form.reset();
  charCount.textContent = '0';
  mensagemSucesso.classList.add('hidden');
  form.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Helpers
function mostrarErro(msg) {
  textoErro.textContent = msg;
  mensagemErro.classList.remove('hidden');
}

function esconderMensagens() {
  mensagemErro.classList.add('hidden');
  mensagemSucesso.classList.add('hidden');
}

// Inicializar
carregarUnidades();
