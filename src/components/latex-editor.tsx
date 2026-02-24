'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { updateResume } from '@/lib/actions/resume-actions';
import { compileTypst } from '@/lib/typst-compiler';

interface Props {
  resumeId: string;
  initialSource: string;
}

export function LatexEditor({ resumeId, initialSource }: Props) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [saving, setSaving] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);

  const save = useCallback(async () => {
    if (!viewRef.current) return;
    const source = viewRef.current.state.doc.toString();
    setSaving(true);
    setCompileError(null);
    await updateResume(resumeId, source);
    try {
      const url = await compileTypst(source);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(url);
    } catch (err) {
      console.error('Compilation failed:', err);
      setCompileError(err instanceof Error ? err.message : 'Compilation failed');
    }
    setSaving(false);
  }, [resumeId, pdfUrl]);

  useEffect(() => {
    if (!editorContainerRef.current || viewRef.current) return;

    const saveKeymap = keymap.of([
      {
        key: 'Mod-s',
        preventDefault: true,
        run: () => {
          save();
          return true;
        },
      },
    ]);

    const state = EditorState.create({
      doc: initialSource,
      extensions: [
        basicSetup,
        oneDark,
        saveKeymap,
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
        }),
      ],
    });

    viewRef.current = new EditorView({
      state,
      parent: editorContainerRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [initialSource, save]);

  return (
    <>
      <div ref={editorContainerRef} className="w-1/2 overflow-hidden border-r" />
      <div className="w-1/2 flex items-center justify-center bg-gray-100 relative">
        {saving && (
          <span className="absolute top-3 right-3 text-xs text-gray-500">Saving...</span>
        )}
        {pdfUrl ? (
          <iframe src={pdfUrl} className="w-full h-full" title="PDF Preview" />
        ) : compileError ? (
          <div className="p-4 max-w-full overflow-auto">
            <p className="text-red-500 font-medium mb-2">Compilation Error</p>
            <pre className="text-xs text-red-400 whitespace-pre-wrap">{compileError}</pre>
          </div>
        ) : (
          <p className="text-gray-400">Press Cmd+S to save and compile</p>
        )}
      </div>
    </>
  );
}
