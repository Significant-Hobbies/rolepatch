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

  const result = world.compile({});
  if (result && result.length > 0 && !result.startsWith('ok')) {
    throw new Error(result);
  }

  const pdfBytes = world.render_pdf();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}
