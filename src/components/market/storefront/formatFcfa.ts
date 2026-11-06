export function formatFcfa(n: number): string {
  const formatted = new Intl.NumberFormat('fr-FR').format(n);
  return formatted.replace(/\s/g, '\u202F') + '\u00A0FCFA';
}
