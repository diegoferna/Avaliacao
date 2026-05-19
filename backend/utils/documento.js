function somenteDigitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function sequenciaRepetida(digits) {
  return /^(\d)\1+$/.test(digits);
}

function validarCpf(digits11) {
  if (!/^\d{11}$/.test(digits11) || sequenciaRepetida(digits11)) {
    return false;
  }

  let soma = 0;
  for (let i = 0; i < 9; i += 1) {
    soma += Number(digits11[i]) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== Number(digits11[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i += 1) {
    soma += Number(digits11[i]) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === Number(digits11[10]);
}

function validarCnsDefinitivo(digits15) {
  const pis = digits15.substring(0, 11);
  let soma = 0;
  for (let i = 0; i < 11; i += 1) {
    soma += Number(pis[i]) * (15 - i);
  }
  let resto = soma % 11;
  let dv = 11 - resto;
  if (dv === 11) dv = 0;
  const esperado = pis + String(dv);
  return esperado === digits15.substring(0, 12);
}

function validarCnsProvisorio(digits15) {
  let soma = 0;
  for (let i = 0; i < 15; i += 1) {
    soma += Number(digits15[i]) * (15 - i);
  }
  return soma % 11 === 0;
}

function validarCns(digits15) {
  if (!/^\d{15}$/.test(digits15) || sequenciaRepetida(digits15)) {
    return false;
  }
  const primeiro = digits15[0];
  if (primeiro === '1' || primeiro === '2') {
    return validarCnsDefinitivo(digits15);
  }
  if (primeiro === '7' || primeiro === '8' || primeiro === '9') {
    return validarCnsProvisorio(digits15);
  }
  return false;
}

function validarCpfOuCns(valor) {
  const digits = somenteDigitos(valor);
  if (digits.length === 11) {
    return { ok: validarCpf(digits), tipo: 'cpf', digits };
  }
  if (digits.length === 15) {
    return { ok: validarCns(digits), tipo: 'cns', digits };
  }
  return { ok: false, tipo: null, digits };
}

module.exports = {
  somenteDigitos,
  validarCpf,
  validarCns,
  validarCpfOuCns,
};
