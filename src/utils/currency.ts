/**
 * Universal Philippine Peso Currency Formatter for Tagpuan Food Hub ERP.
 * Strictly adheres to ₱ currency symbol formatting with Philippine comma delimiters (en-PH).
 * Example: ₱16.00, ₱45.00, ₱1,250.00
 */

export function formatPHP(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return '₱0.00';
  }
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]+/g, ''));
  if (isNaN(num)) {
    return '₱0.00';
  }
  return `₱${num.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function formatPHPWithoutSign(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return '0.00';
  }
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]+/g, ''));
  if (isNaN(num)) {
    return '0.00';
  }
  return num.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Alias for convenience
export const formatPeso = formatPHP;
export const formatCurrency = formatPHP;
