const API_URL = window.location.origin;

const form = document.getElementById('form-avaliacao');
const selectUnidade = document.getElementById('unidade');
const selectEquipe = document.getElementById('equipe');
const equipeWrap = document.getElementById('equipe-wrap');
const equipeTrigger = document.getElementById('equipe-trigger');
const equipeTriggerLabel = document.getElementById('equipe-trigger-label');
const equipePanel = document.getElementById('equipe-panel');
const comentario = document.getElementById('comentario');
const charCount = document.getElementById('char-count');
const btnEnviar = document.getElementById('btn-enviar');
const mensagemSucesso = document.getElementById('mensagem-sucesso');
const mensagemErro = document.getElementById('mensagem-erro');
const textoErro = document.getElementById('texto-erro');
const btnNovaAvaliacao = document.getElementById('btn-nova-avaliacao');

const campos = ['acesso', 'integralidade', 'longitudinalidade', 'receptividade', 'atendimento'];

/** Lista: fundo com cor identificável. Hover: mais saturado (mesma cor da equipe; CSS evita hover azul do SO). */
const TINT_LISTA = 0.38;
const TINT_HOVER = 0.58;
const TINT_TRIGGER = 0.32;

const COR_TEXTO_EQUIPES = '#374151';

function misturarComBranco(hex, intensidade) {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/i.test(hex)) return '#f9fafb';
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const t = Math.min(1, Math.max(0, intensidade));
  const r2 = Math.round(255 * (1 - t) + r * t);
  const g2 = Math.round(255 * (1 - t) + g * t);
  const b2 = Math.round(255 * (1 - t) + b * t);
  return `rgb(${r2},${g2},${b2})`;
}

function rotuloOpcaoEquipe(e) {
  const nome = (e.nome || '').trim();
  const rotuloCor = (e.cor_label && String(e.cor_label).trim()) || (e.cor && String(e.cor).trim()) || '';
  if (!rotuloCor) return nome;
  return `${nome} (${rotuloCor})`;
}

function limparTriggerEquipe() {
  if (!equipeTrigger) return;
  equipeTrigger.style.backgroundColor = '';
  equipeTrigger.style.color = '';
  equipeTrigger.style.borderColor = '';
  equipeTrigger.style.borderLeft = '';
}

function atualizarTriggerEquipe() {
  if (!equipeTrigger || !equipeTriggerLabel) return;
  const opt = selectEquipe.selectedOptions[0];
  if (!opt || !opt.value) {
    limparTriggerEquipe();
    if (selectEquipe.disabled) {
      equipeTriggerLabel.textContent = 'Selecione primeiro o estabelecimento...';
    } else {
      equipeTriggerLabel.textContent = 'Selecione a equipe de saúde...';
    }
    equipeTriggerLabel.classList.add('text-gray-500');
    return;
  }
  const cor = opt.dataset.cor;
  equipeTriggerLabel.textContent = opt.textContent || '';
  equipeTriggerLabel.classList.remove('text-gray-500');
  if (cor && /^#[0-9A-Fa-f]{6}$/i.test(cor)) {
    equipeTrigger.style.backgroundColor = misturarComBranco(cor, TINT_TRIGGER);
    equipeTrigger.style.color = COR_TEXTO_EQUIPES;
    equipeTrigger.style.borderColor = '#e5e7eb';
    equipeTrigger.style.borderLeft = `4px solid ${cor}`;
  } else {
    limparTriggerEquipe();
  }
}

function painelEquipeAberto() {
  return equipePanel && !equipePanel.classList.contains('hidden');
}

function cardDoDropdown() {
  if (!equipeWrap) return null;
  return equipeWrap.closest('.card');
}

function atualizarCamadaDropdown(ativo) {
  const card = cardDoDropdown();
  if (!card) return;
  card.classList.toggle('card-com-dropdown-open', Boolean(ativo));
}

function fecharPainelEquipe() {
  if (!equipePanel || !equipeTrigger) return;
  equipePanel.classList.add('hidden');
  equipeWrap.classList.remove('equipe-open');
  atualizarCamadaDropdown(false);
  equipeTrigger.setAttribute('aria-expanded', 'false');
}

function abrirPainelEquipe() {
  if (!equipePanel || !equipeTrigger || equipeTrigger.disabled) return;
  equipePanel.classList.remove('hidden');
  equipeWrap.classList.add('equipe-open');
  atualizarCamadaDropdown(true);
  equipeTrigger.setAttribute('aria-expanded', 'true');
}

function togglePainelEquipe() {
  if (painelEquipeAberto()) fecharPainelEquipe();
  else abrirPainelEquipe();
}

function renderizarPainelEquipes(equipes) {
  if (!equipePanel) return;
  equipePanel.innerHTML = '';
  equipes.forEach((e) => {
    const hex = (e.cor || '').trim();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('role', 'option');
    btn.className = 'equipe-item w-full text-left px-4 py-2.5 text-sm border-0 border-b border-gray-100 last:border-b-0';
    btn.textContent = rotuloOpcaoEquipe(e);
    if (/^#[0-9A-Fa-f]{6}$/i.test(hex)) {
      btn.style.setProperty('--equipe-bg', misturarComBranco(hex, TINT_LISTA));
      btn.style.setProperty('--equipe-bg-hover', misturarComBranco(hex, TINT_HOVER));
      btn.style.color = COR_TEXTO_EQUIPES;
    } else {
      btn.style.setProperty('--equipe-bg', '#f9fafb');
      btn.style.setProperty('--equipe-bg-hover', '#f3f4f6');
      btn.style.color = COR_TEXTO_EQUIPES;
    }
    btn.addEventListener('click', () => {
      selectEquipe.value = String(e.id);
      selectEquipe.dispatchEvent(new Event('change', { bubbles: true }));
      fecharPainelEquipe();
    });
    equipePanel.appendChild(btn);
  });
}

document.addEventListener('click', (ev) => {
  if (!equipeWrap || !painelEquipeAberto()) return;
  if (!equipeWrap.contains(ev.target)) fecharPainelEquipe();
});

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && painelEquipeAberto()) {
    fecharPainelEquipe();
  }
});

if (equipeTrigger) {
  equipeTrigger.addEventListener('click', (ev) => {
    ev.preventDefault();
    if (equipeTrigger.disabled) return;
    togglePainelEquipe();
  });
}

function resetEquipeSelect() {
  selectEquipe.innerHTML = '<option value="">Selecione primeiro o estabelecimento...</option>';
  selectEquipe.disabled = true;
  selectEquipe.value = '';
  selectEquipe.classList.remove('border-red-400');
  if (equipeTrigger) {
    equipeTrigger.disabled = true;
    equipeTrigger.classList.remove('border-red-400');
  }
  if (equipePanel) equipePanel.innerHTML = '';
  fecharPainelEquipe();
  limparTriggerEquipe();
  if (equipeTriggerLabel) {
    equipeTriggerLabel.textContent = 'Selecione primeiro o estabelecimento...';
    equipeTriggerLabel.classList.add('text-gray-500');
  }
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
  if (equipeTrigger) equipeTrigger.disabled = true;
  if (equipeTriggerLabel) equipeTriggerLabel.textContent = 'Carregando equipes...';

  try {
    const resp = await fetch(`${API_URL}/equipes?unidade_id=${encodeURIComponent(unidadeId)}`);
    if (!resp.ok) throw new Error('Erro ao carregar equipes');
    const equipes = await resp.json();

    selectEquipe.innerHTML = '';

    const optPlaceholder = document.createElement('option');
    optPlaceholder.value = '';
    optPlaceholder.textContent = 'Selecione a equipe de saúde...';
    selectEquipe.appendChild(optPlaceholder);

    equipes.forEach((e) => {
      const option = document.createElement('option');
      option.value = e.id;
      option.dataset.cor = e.cor || '';
      option.dataset.corLabel = e.cor_label != null ? String(e.cor_label) : '';
      option.textContent = rotuloOpcaoEquipe(e);
      selectEquipe.appendChild(option);
    });

    renderizarPainelEquipes(equipes);

    selectEquipe.disabled = false;
    if (equipeTrigger) equipeTrigger.disabled = false;
    if (equipeTriggerLabel) {
      equipeTriggerLabel.textContent = 'Selecione a equipe de saúde...';
      equipeTriggerLabel.classList.add('text-gray-500');
    }

    atualizarTriggerEquipe();
  } catch (err) {
    selectEquipe.innerHTML = '';
    const optErr = document.createElement('option');
    optErr.value = '';
    optErr.textContent = 'Não foi possível carregar as equipes';
    selectEquipe.appendChild(optErr);
    selectEquipe.disabled = true;
    if (equipePanel) equipePanel.innerHTML = '';
    if (equipeTrigger) equipeTrigger.disabled = true;
    if (equipeTriggerLabel) equipeTriggerLabel.textContent = 'Erro ao carregar equipes';
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
    if (equipeTrigger) equipeTrigger.classList.add('border-red-400');
    valido = false;
  } else {
    erroEquipe.classList.add('hidden');
    selectEquipe.classList.remove('border-red-400');
    if (equipeTrigger) equipeTrigger.classList.remove('border-red-400');
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
  if (equipeTrigger) equipeTrigger.classList.remove('border-red-400');
  atualizarTriggerEquipe();
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
