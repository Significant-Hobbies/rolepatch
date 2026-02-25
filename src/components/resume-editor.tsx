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

const FONT_OPTIONS = [
  { label: 'Charter', value: "'Charter', 'Georgia', 'Times New Roman', serif" },
  { label: 'Georgia', value: "'Georgia', 'Times New Roman', serif" },
  { label: 'Times New Roman', value: "'Times New Roman', serif" },
  { label: 'Garamond', value: "'Garamond', 'Georgia', serif" },
  { label: 'Helvetica', value: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif" },
  { label: 'Arial', value: "'Arial', 'Helvetica', sans-serif" },
  { label: 'Calibri', value: "'Calibri', 'Helvetica', sans-serif" },
  { label: 'System Sans', value: "system-ui, -apple-system, sans-serif" },
];

export function ResumeEditor({ resumeId, initialSource }: Props) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState(initialSource);
  const [showConfig, setShowConfig] = useState(false);

  const [fontSize, setFontSize] = useState(10.5);
  const [lineHeight, setLineHeight] = useState(1.35);
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].value);
  const [margin, setMargin] = useState(0.5);

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

  const cssVars = {
    '--resume-font-size': `${fontSize}pt`,
    '--resume-line-height': String(lineHeight),
    '--resume-font-family': fontFamily,
    '--resume-margin': `${margin}in`,
  } as React.CSSProperties;

  return (
    <>
      <div className="w-1/2 flex flex-col overflow-hidden border-r print-hide">
        <div className="flex items-center justify-between px-3 py-1.5 border-b bg-gray-50">
          <span className="text-xs text-gray-500">{saving ? 'Saving...' : 'Markdown'}</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setShowConfig((v) => !v)}
              className={`px-3 py-1 text-xs rounded ${showConfig ? 'bg-gray-300 text-gray-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Settings
            </button>
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
        {showConfig && (
          <div className="flex flex-wrap gap-x-4 gap-y-2 px-3 py-2 border-b bg-gray-50 text-xs">
            <label className="flex items-center gap-1.5">
              <span className="text-gray-500">Font</span>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="border rounded px-1.5 py-0.5 bg-white text-gray-700"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.label} value={f.value}>{f.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-gray-500">Size</span>
              <input
                type="number"
                min={8}
                max={14}
                step={0.5}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="border rounded px-1.5 py-0.5 w-14 bg-white text-gray-700"
              />
              <span className="text-gray-400">pt</span>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-gray-500">Line height</span>
              <input
                type="number"
                min={1}
                max={2}
                step={0.05}
                value={lineHeight}
                onChange={(e) => setLineHeight(Number(e.target.value))}
                className="border rounded px-1.5 py-0.5 w-14 bg-white text-gray-700"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-gray-500">Margin</span>
              <input
                type="number"
                min={0.25}
                max={1}
                step={0.05}
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
                className="border rounded px-1.5 py-0.5 w-14 bg-white text-gray-700"
              />
              <span className="text-gray-400">in</span>
            </label>
          </div>
        )}
        <div ref={editorContainerRef} className="flex-1 overflow-hidden" />
      </div>
      <div className="w-1/2 overflow-y-auto bg-gray-100 p-6" id="resume-print-target">
        <div className="resume-preview" style={cssVars}>
          <Markdown>{source}</Markdown>
        </div>
      </div>
    </>
  );
}
