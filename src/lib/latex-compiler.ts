let engine: any = null;

export async function initCompiler(): Promise<void> {
  if (engine) return;
  if (typeof window === 'undefined') return;

  const script = document.createElement('script');
  script.src = '/PdfTeXEngine.js';
  document.head.appendChild(script);

  await new Promise<void>((resolve, reject) => {
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PdfTeXEngine.js'));
  });

  engine = new (window as any).PdfTeXEngine();
  await engine.loadEngine();
}

export async function compileLatex(source: string): Promise<string> {
  await initCompiler();
  if (!engine) throw new Error('LaTeX compiler not available');

  engine.writeMemFSFile('input.tex', source);
  engine.setEngineMainFile('input.tex');
  const result = await engine.compileLaTeX();

  if (result.status !== 0) {
    throw new Error(result.log || 'LaTeX compilation failed');
  }

  const pdfBlob = new Blob([result.pdf], { type: 'application/pdf' });
  return URL.createObjectURL(pdfBlob);
}
