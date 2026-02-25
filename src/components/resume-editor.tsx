'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { markdown } from '@codemirror/lang-markdown';
import Markdown from 'react-markdown';
import { updateResume } from '@/lib/actions/resume-actions';
import '@/styles/resume-print.css';

interface Props {
  resumeId: string;
  initialSource: string;
}

export function ResumeEditor({ resumeId, initialSource }: Props) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState(initialSource);

  const save = useCallback(async () => {
    if (!viewRef.current) return;
    const text = viewRef.current.state.doc.toString();
    setSaving(true);
    await updateResume(resumeId, text);
    setSource(text);
    setSaving(false);
  }, [resumeId]);

  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!editorContainerRef.current || viewRef.current) return;

    const saveKeymap = keymap.of([
      {
        key: 'Mod-s',
        preventDefault: true,
        run: () => {
          saveRef.current();
          return true;
        },
      },
    ]);

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        setSource(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: initialSource,
      extensions: [
        basicSetup,
        oneDark,
        markdown(),
        saveKeymap,
        updateListener,
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
  }, [initialSource]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <>
      <div className="w-1/2 flex flex-col overflow-hidden border-r print-hide">
        <div className="flex items-center justify-between px-3 py-1.5 border-b bg-gray-50">
          <span className="text-xs text-gray-500">{saving ? 'Saving...' : 'Markdown'}</span>
          <div className="flex gap-1.5">
            <button
              onClick={handlePrint}
              className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Print / Export PDF
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
        <div ref={editorContainerRef} className="flex-1 overflow-hidden" />
      </div>
      <div className="w-1/2 overflow-y-auto bg-gray-100 p-6" id="resume-print-target">
        <div className="resume-preview">
          <Markdown>{source}</Markdown>
        </div>
      </div>
    </>
  );
}
