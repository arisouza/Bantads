import Decimal from 'decimal.js';

export function formatarMoeda(
  valor: string | null | undefined
): string | null {
  try {
    if (typeof valor !== 'string' || !valor.trim()) {
      return null;
    }

    const valorDecimal = new Decimal(valor);

    if (!valorDecimal.isFinite()) {
      return null;
    }

    const [parteInteira, parteDecimal] =
      valorDecimal.toFixed(2).split('.');

    const parteInteiraFormatada = parteInteira.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      '.'
    );

    return `R$ ${parteInteiraFormatada},${parteDecimal}`;
  } catch {
    return null;
  }
}