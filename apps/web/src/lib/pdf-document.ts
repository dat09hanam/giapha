export type PdfImagePage = {
  jpeg: Uint8Array;
  width: number;
  height: number;
  pageWidth?: number;
  pageHeight?: number;
};

/** JPEG page streams keep Vietnamese glyphs identical to the browser's rendering. */
export function imagePagesPdf(pages: readonly PdfImagePage[]): Blob {
  if (!pages.length) throw new Error('PDF phải có ít nhất một trang.');
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets = [0];
  let length = 0;
  const append = (value: string | Uint8Array): void => {
    const bytes = typeof value === 'string' ? encoder.encode(value) : value;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (id: number, value: string): void => {
    offsets[id] = length;
    append(`${id} 0 obj\n${value}\nendobj\n`);
  };
  append('%PDF-1.4\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(
    2,
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  );
  pages.forEach(({ jpeg, width, height, pageWidth = 595, pageHeight = 842 }, index) => {
    const id = 3 + index * 3;
    object(
      id,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Image ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`,
    );
    offsets[id + 1] = length;
    append(
      `${id + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
    );
    append(jpeg);
    append('\nendstream\nendobj\n');
    const commands = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Image Do\nQ\n`;
    object(
      id + 2,
      `<< /Length ${encoder.encode(commands).length} >>\nstream\n${commands}endstream`,
    );
  });
  const xref = length;
  const count = 3 + pages.length * 3;
  append(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let id = 1; id < count; id++) append(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  append(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(
    chunks.map((chunk) => new Uint8Array(chunk).buffer),
    { type: 'application/pdf' },
  );
}

export function downloadPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 160)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function canvasJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('Không thể tạo trang PDF.'))),
      'image/jpeg',
      0.95,
    ),
  );
  return new Uint8Array(await blob.arrayBuffer());
}
