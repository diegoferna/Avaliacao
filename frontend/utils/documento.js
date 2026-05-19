/**
 * Validação de CPF e CNS (alinhado à regra Mãe Salvador / documento de referência).
 * Sempre validar sobre dígitos puros (sem máscara).
 */
(function (global) {
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

  function validarCnsTipo1(digits15) {
    const primeiro = digits15[0];
    if (primeiro !== '1' && primeiro !== '2') return false;

    const base11 = digits15.substring(0, 11);
    let soma = 0;
    for (let i = 0; i < 11; i += 1) {
      soma += Number(base11[i]) * (15 - i);
    }

    let dv = 11 - (soma % 11);
    if (dv === 11) dv = 0;

    let esperado;
    if (dv === 10) {
      const soma2 = soma + 2;
      let dv2 = 11 - (soma2 % 11);
      if (dv2 === 11) dv2 = 0;
      esperado = `${base11}001${dv2}`;
    } else {
      esperado = `${base11}000${dv}`;
    }

    return digits15 === esperado;
  }

  function validarCnsTipo2(digits15) {
    const primeiro = Number(digits15[0]);
    if (primeiro !== 7 && primeiro !== 8 && primeiro !== 9) return false;

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
      return validarCnsTipo1(digits15);
    }
    if (primeiro === '7' || primeiro === '8' || primeiro === '9') {
      return validarCnsTipo2(digits15);
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

  global.DocumentoUtils = {
    somenteDigitos,
    validarCpf,
    validarCns,
    validarCnsTipo1,
    validarCnsTipo2,
    validarCpfOuCns,
  };
})(typeof window !== 'undefined' ? window : globalThis);
