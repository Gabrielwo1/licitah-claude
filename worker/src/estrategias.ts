/**
 * Motor de estratégias de lance.
 *
 * Cada estratégia recebe o estado atual da disputa e decide
 * se deve dar um lance agora e qual o valor.
 */

export type Estrategia = 'agressiva' | 'moderada' | 'conservadora';

export interface EstadoDisputa {
  melhorLanceAtual: number;   // Menor lance na sessão (concorrente ou nosso)
  nossoMelhorLance: number | null;
  somosMelhor: boolean;       // Se o menor lance é nosso
  precoMinimo: number;        // Piso — nunca dar lance abaixo disso
  minutosRestantes: number;   // Tempo restante da disputa
  decrementoValor: number | null;
  decrementoPct: number | null;
}

export interface DecisaoLance {
  darLance: boolean;
  valor?: number;
  motivo: string;
}

function calcularDecremento(
  base: number,
  decrementoValor: number | null,
  decrementoPct: number | null
): number {
  if (decrementoValor) return decrementoValor;
  if (decrementoPct)   return base * (decrementoPct / 100);
  return 0.01; // default: 1 centavo
}

/**
 * Agressiva: sempre tenta estar 1 decremento abaixo do menor lance.
 * Lance imediatamente quando não somos o melhor.
 */
function agressiva(estado: EstadoDisputa): DecisaoLance {
  if (estado.somosMelhor) {
    return { darLance: false, motivo: 'Já somos o melhor lance' };
  }

  const decr  = calcularDecremento(estado.melhorLanceAtual, estado.decrementoValor, estado.decrementoPct);
  const valor = Math.round((estado.melhorLanceAtual - decr) * 100) / 100;

  if (valor < estado.precoMinimo) {
    return { darLance: false, motivo: `Lance (${valor}) ficaria abaixo do preço mínimo (${estado.precoMinimo})` };
  }

  return { darLance: true, valor, motivo: `Agressiva: decremento de ${decr} sobre ${estado.melhorLanceAtual}` };
}

/**
 * Moderada: dá lance apenas quando o melhor lance atual ultrapassar
 * a nossa margem mínima de rentabilidade (preco_minimo + buffer de 5%).
 */
function moderada(estado: EstadoDisputa): DecisaoLance {
  if (estado.somosMelhor) {
    return { darLance: false, motivo: 'Já somos o melhor lance' };
  }

  // Só lança se o concorrente está com margem > 5% acima do nosso mínimo
  const threshold = estado.precoMinimo * 1.05;
  if (estado.melhorLanceAtual <= threshold) {
    return { darLance: false, motivo: `Melhor lance (${estado.melhorLanceAtual}) está próximo do mínimo — aguardando` };
  }

  const decr  = calcularDecremento(estado.melhorLanceAtual, estado.decrementoValor, estado.decrementoPct);
  const valor = Math.round((estado.melhorLanceAtual - decr) * 100) / 100;

  if (valor < estado.precoMinimo) {
    return { darLance: false, motivo: `Lance ficaria abaixo do preço mínimo` };
  }

  return { darLance: true, valor, motivo: `Moderada: lance com margem suficiente` };
}

/**
 * Conservadora: só dá lance nos últimos 2 minutos da disputa.
 * Evita revelar interesse cedo e aguarda concorrentes se exporem.
 */
function conservadora(estado: EstadoDisputa): DecisaoLance {
  if (estado.somosMelhor) {
    return { darLance: false, motivo: 'Já somos o melhor lance' };
  }

  if (estado.minutosRestantes > 2) {
    return { darLance: false, motivo: `Conservadora: aguardando (${estado.minutosRestantes} min restantes)` };
  }

  const decr  = calcularDecremento(estado.melhorLanceAtual, estado.decrementoValor, estado.decrementoPct);
  const valor = Math.round((estado.melhorLanceAtual - decr) * 100) / 100;

  if (valor < estado.precoMinimo) {
    return { darLance: false, motivo: `Lance ficaria abaixo do preço mínimo` };
  }

  return { darLance: true, valor, motivo: `Conservadora: últimos minutos — acionando` };
}

export function decidirLance(estrategia: Estrategia, estado: EstadoDisputa): DecisaoLance {
  switch (estrategia) {
    case 'agressiva':    return agressiva(estado);
    case 'moderada':     return moderada(estado);
    case 'conservadora': return conservadora(estado);
    default:             return { darLance: false, motivo: 'Estratégia desconhecida' };
  }
}
