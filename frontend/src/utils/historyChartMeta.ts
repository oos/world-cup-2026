export function formatChartAccordionMeta(
  yearLabel: string,
  count: number,
  singular: string,
  plural: string
): string {
  return `${yearLabel} · ${count} ${count === 1 ? singular : plural}`;
}
