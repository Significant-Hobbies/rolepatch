/** Extract PDFs on the device: PDF.js requires browser APIs unavailable in Workers. */
export async function prepareResumeFile(file: File): Promise<File> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return file;

  try {
    const { PDFParse } = await import('pdf-parse');
    PDFParse.setWorker(
      typeof window === 'undefined'
        ? ''
        : new URL('../../node_modules/pdf-parse/dist/pdf-parse/web/pdf.worker.mjs', import.meta.url)
            .href
    );
    const parser = new PDFParse({ data: new Uint8Array(await file.arrayBuffer()) });
    try {
      const { text } = await parser.getText();
      if (text.trim().length < 50) {
        throw new Error(
          'This PDF has too little readable text. Try a text-based PDF or DOCX file.'
        );
      }
      return new File([text], `${file.name}.txt`, { type: 'text/plain' });
    } finally {
      await parser.destroy();
    }
  } catch {
    throw new Error('Could not read this PDF. Try an unlocked, text-based PDF or a DOCX file.');
  }
}
