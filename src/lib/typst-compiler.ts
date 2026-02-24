let wasmModule: typeof import('@brief-jetzt/wasm-typst') | null = null;

async function getModule() {
  if (wasmModule) return wasmModule;
  wasmModule = await import('@brief-jetzt/wasm-typst');
  return wasmModule;
}

export async function compileTypst(source: string): Promise<string> {
  const { World, SourceInput } = await getModule();

  const world = World.new();
  const src = SourceInput.new('main.typ', source);
  world.setSourcesAndFiles([src], []);

  const diagnostics = world.compile({});
  console.log('Typst diagnostics:', diagnostics);
  if (diagnostics.includes('Error')) {
    throw new Error(diagnostics);
  }

  const pdfBytes = world.render_pdf();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}
