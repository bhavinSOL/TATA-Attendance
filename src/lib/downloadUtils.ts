import html2canvas from 'html2canvas';

/**
 * Download a DOM element as a PNG image using html2canvas.
 */
export async function downloadChartAsImage(
  element: HTMLElement,
  filename = 'chart.png'
): Promise<boolean> {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
    });
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert an array of objects to a CSV string and trigger download.
 */
export function downloadDataAsCSV<T extends Record<string, unknown>>(
  data: T[],
  filename = 'data.csv'
): void {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = String(val);
          // Escape if contains comma, quote, or newline
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    ),
  ];

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
