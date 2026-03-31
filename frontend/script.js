const API_URL = window.location.origin;

const form = document.getElementById('form-avaliacao');
const selectUnidade = document.getElementById('unidade');
const selectEquipe = document.getElementById('equipe');
const equipeCorWrap = document.getElementById('equipe-cor-wrap');
const equipeSwatch = document.getElementById('equipe-swatch');
const equipeCorTexto = document.getElementById('equipe-cor-texto');
const equipeContagem = document.getElementById('equipe-contagem');
const comentario = document.getElementById('comentario');
const charCount = document.getElementById('char-count');
const btnEnviar = document.getElementById('btn-enviar');
const mensagemSucesso = document.getElementById('mensagem-sucesso');
const mensagemErro = document.getElementById('mensagem-erro');
const textoErro = document.getElementById('texto-erro');
const btnNovaAvaliacao = document.getElementById('btn-nova-avaliacao');

const campos = ['acesso', 'integralidade', 'longitudinalidade', 'receptividade', 'atendimento'];

function resetEquipeSelect() {
  selectEquipe.innerHTML = '<option value="">Selecione primeiro o estabelecimento...</option>';
  selectEquipe.disabled = true;
  selectEquipe.value = '';
  selectEquipe.classList.remove('border-red-400');
  equipeCorWrap.classList.add('hidden');
  equipeSwatch.style.backgroundColor = '';
  equipeCorTexto.textContent = '';
  selectEquipe.style.boxShadow = '';
  selectEquipe.style.borderColor = '';
  if (equipeContagem) {
    equipeContagem.textContent = '';
    equipeContagem.classList.add('hidden');
  }
}

function sombraCorHex(hex, alpha) {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return 'none';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `0 0 0 3px rgba(${r},${g},${b},${alpha})`;
}

function textoCorEquipe(opt) {
  const label = (opt.dataset.corLabel || '').trim();
  if (label) return label;
  const hex = (opt.dataset.cor || '').trim();
  return hex || '—';
}

function aplicarEstiloEquipeSelecionada() {
  const opt = selectEquipe.selectedOptions[0];
  if (!opt || !opt.value || !opt.dataset.cor) {
    equipeCorWrap.classList.add('hidden');
    equipeSwatch.style.backgroundColor = '';
    equipeCorTexto.textContent = '';
    selectEquipe.style.boxShadow = '';
    selectEquipe.style.borderColor = '';
    return;
  }
  const cor = opt.dataset.cor;
  equipeSwatch.style.backgroundColor = cor;
  equipeCorTexto.textContent = textoCorEquipe(opt);
  equipeCorWrap.classList.remove('hidden');
  selectEquipe.style.boxShadow = sombraCorHex(cor, 0.22);
  selectEquipe.style.borderColor = '#d1d5db';
}

function rotuloOpcaoEquipe(e) {
  const nome = (e.nome || '').trim();
  const rotuloCor = (e.cor_label && String(e.cor_label).trim()) || (e.cor && String(e.cor).trim()) || '';
  if (!rotuloCor) return nome;
  return `${nome} (${rotuloCor})`;
}

async function carregarUnidades() {
  try {
    const resp = await fetch(`${API_URL}/unidades`);
    if (!resp.ok) throw new Error('Erro ao carregar unidades');
    const unidades = await resp.json();

    unidades.forEach((u) => {
      const option = document.createElement('option');
      option.value = u.id;
      option.textContent = u.nome;
      selectUnidade.appendChild(option);
    });
  } catch (err) {
    mostrarErro('Não foi possível carregar os estabelecimentos de saúde. Verifique sua conexão.');
  }
}

async function carregarEquipes(unidadeId) {
  resetEquipeSelect();
  if (!unidadeId) return;

  selectEquipe.disabled = true;
  selectEquipe.innerHTML = '<option value="">Carregando equipes...</option>';

  try {
    const resp = await fetch(`${API_URL}/equipes?unidade_id=${encodeURIComponent(unidadeId)}`);
    if (!resp.ok) throw new Error('Erro ao carregar equipes');
    const equipes = await resp.json();

    selectEquipe.innerHTML = '<option value="">Selecione a equipe de saúde...</option>';
    equipes.forEach((e) => {
      const option = document.createElement('option');
      option.value = e.id;
      option.dataset.cor = e.cor || '';
      option.dataset.corLabel = e.cor_label != null ? String(e.cor_label) : '';
      option.textContent = rotuloOpcaoEquipe(e);
      selectEquipe.appendChild(option);
    });
    selectEquipe.disabled = false;
    if (equipeContagem) {
      const n = equipes.length;
      equipeContagem.textContent =
        n > 0 ? `${n} equipe${n === 1 ? '' : 's'} ativa${n === 1 ? '' : 's'} nesta unidade` : '';
      equipeContagem.classList.toggle('hidden', n === 0);
    }
  } catch (err) {
    selectEquipe.innerHTML = '<option value="">Não foi possível carregar as equipes</option>';
    mostrarErro('Não foi possível carregar as equipes de saúde. Verifique sua conexão.');
  }
}

comentario.addEventListener('input', () => {
  charCount.textContent = String(comentario.value.length);
});

function validarFormulario() {
  let valido = true;

  const erroUnidade = document.getElementById('erro-unidade');
  if (!selectUnidade.value) {
    erroUnidade.classList.remove('hidden');
    selectUnidade.classList.add('border-red-400');
    valido = false;
  } else {
    erroUnidade.classList.add('hidden');
    selectUnidade.classList.remove('border-red-400');
  }

  const erroEquipe = document.getElementById('erro-equipe');
  if (!selectEquipe.value || selectEquipe.disabled) {
    erroEquipe.classList.remove('hidden');
    selectEquipe.classList.add('border-red-400');
    valido = false;
  } else {
    erroEquipe.classList.add('hidden');
    selectEquipe.classList.remove('border-red-400');
  }

  campos.forEach((campo) => {
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

selectUnidade.addEventListener('change', () => {
  document.getElementById('erro-unidade').classList.add('hidden');
  selectUnidade.classList.remove('border-red-400');
  document.getElementById('erro-equipe').classList.add('hidden');
  carregarEquipes(selectUnidade.value);
});

selectEquipe.addEventListener('change', () => {
  document.getElementById('erro-equipe').classList.add('hidden');
  selectEquipe.classList.remove('border-red-400');
  aplicarEstiloEquipeSelecionada();
});

campos.forEach((campo) => {
  document.querySelectorAll(`input[name="${campo}"]`).forEach((radio) => {
    radio.addEventListener('change', () => {
      const pergunta = document.querySelector(`[data-campo="${campo}"]`);
      pergunta.classList.remove('erro');
      pergunta.querySelector('.erro-campo').classList.add('hidden');
    });
  });
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  esconderMensagens();

  if (!validarFormulario()) {
    const primeiroErro = document.querySelector(
      '.erro-campo:not(.hidden), #erro-unidade:not(.hidden), #erro-equipe:not(.hidden)'
    );
    if (primeiroErro) {
      primeiroErro.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  const dados = {
    unidade_id: parseInt(selectUnidade.value, 10),
    equipe_id: parseInt(selectEquipe.value, 10),
    comentario: comentario.value.trim() || undefined,
  };

  campos.forEach((campo) => {
    dados[campo] = parseInt(document.querySelector(`input[name="${campo}"]:checked`).value, 10);
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

btnNovaAvaliacao.addEventListener('click', () => {
  form.reset();
  charCount.textContent = '0';
  resetEquipeSelect();
  carregarEquipes('');
  mensagemSucesso.classList.add('hidden');
  form.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

function mostrarErro(msg) {
  textoErro.textContent = msg;
  mensagemErro.classList.remove('hidden');
}

function esconderMensagens() {
  mensagemErro.classList.add('hidden');
  mensagemSucesso.classList.add('hidden');
}

carregarUnidades();
