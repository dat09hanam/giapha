import { canvasJpeg, downloadPdf, imagePagesPdf, type PdfImagePage } from '@/lib/pdf-document';

export type PdfReport = {
  title: string;
  scope: string;
  lines: readonly string[];
  images?: readonly string[];
};

/** Word wrapping also splits long unbroken tokens rather than cutting off data. */
export function wrapPdfText(
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) {
        lines.push(line);
        line = '';
      }
      for (const char of word) {
        if (line && measure(line + char) > maxWidth) {
          lines.push(line);
          line = '';
        }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function loadPdfImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    const timeout = window.setTimeout(() => resolve(null), 5000);
    image.crossOrigin = 'use-credentials';
    image.onload = () => {
      window.clearTimeout(timeout);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      resolve(null);
    };
    image.src = src;
  });
}

/** Render bounded A4 pages locally; no report contents are sent to an external service. */
export async function downloadReportPdf(
  report: PdfReport,
  familyName: string,
  filename: string,
): Promise<void> {
  await document.fonts.ready;
  const pages: PdfImagePage[] = [];
  const canvas = document.createElement('canvas');
  canvas.width = 1190;
  canvas.height = 1684;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ tạo PDF.');
  const date = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date());
  let y = 0;
  const startPage = (): void => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#543619';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(familyName, 80, 65, 1030);
    ctx.fillStyle = '#78716c';
    ctx.font = '20px sans-serif';
    ctx.fillText(`Ngày xuất: ${date} · Trang ${pages.length + 1}`, 80, 98);
    ctx.fillStyle = '#292524';
    ctx.font = '24px sans-serif';
    y = 152;
  };
  const finishPage = async (): Promise<void> => {
    pages.push({ jpeg: await canvasJpeg(canvas), width: canvas.width, height: canvas.height });
  };
  startPage();
  for (const line of [report.title, `Phạm vi: ${report.scope}`, '', ...report.lines]) {
    for (const wrapped of wrapPdfText(line, 1030, (value) => ctx.measureText(value).width)) {
      if (y > 1570) {
        await finishPage();
        startPage();
      }
      ctx.fillText(wrapped, 80, y);
      y += 36;
    }
    y += 10;
  }
  for (const src of report.images ?? []) {
    const image = await loadPdfImage(src);
    if (!image) {
      if (y > 1570) {
        await finishPage();
        startPage();
      }
      ctx.fillText('Ảnh không tải được.', 80, y);
      y += 46;
      continue;
    }
    const ratio = Math.min(1030 / image.naturalWidth, 1000 / image.naturalHeight);
    const w = image.naturalWidth * ratio;
    const h = image.naturalHeight * ratio;
    if (y + h > 1580) {
      await finishPage();
      startPage();
    }
    ctx.drawImage(image, 80, y, w, h);
    y += h + 32;
  }
  await finishPage();
  downloadPdf(imagePagesPdf(pages), filename);
}
