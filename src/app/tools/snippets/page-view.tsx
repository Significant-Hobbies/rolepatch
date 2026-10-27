import Link from 'next/link';
import type { useSnippetsPageSourceState } from './page-state';

export function SnippetsPageView(view: ReturnType<typeof useSnippetsPageSourceState>) {
  'use no memo';
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="text-xs text-stone-500 hover:underline">
        ← RolePatch
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Snippet library</h1>
      <p className="mt-3 text-sm text-stone-600">
        Save reusable cover-letter or resume paragraphs once, paste them anywhere. Everything lives
        in this browser&apos;s localStorage — nothing is sent server-side.
      </p>

      <section className="mt-8 rounded-md border border-stone-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-stone-500">
          {view.editingId ? 'Edit snippet' : 'New snippet'}
        </p>
        <input
          value={view.title}
          onChange={(e) => view.setTitle(e.target.value)}
          placeholder="Title — e.g. 'Why I ship — generic open'"
          className="mt-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
        <textarea
          value={view.body}
          onChange={(e) => view.setBody(e.target.value)}
          placeholder="Body — the actual paragraph or bullet block."
          className="mt-3 h-40 w-full resize-y rounded-md border border-stone-300 p-3 font-mono text-xs"
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={view.submit}
            disabled={!view.title.trim() || !view.body.trim()}
            className="rounded-md bg-stone-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-40"
          >
            {view.editingId ? 'Save edits' : 'Save snippet'}
          </button>
          {view.editingId && (
            <button
              type="button"
              onClick={() => {
                view.setEditingId(null);
                view.setTitle('');
                view.setBody('');
              }}
              className="rounded-md border border-stone-300 px-4 py-1.5 text-sm text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
          )}
        </div>
      </section>

      <section className="mt-10 space-y-3">
        {view.snips.length === 0 ? (
          <p className="text-sm text-stone-500">No snippets yet. Save your first one above.</p>
        ) : (
          view.snips.map((s) => (
            <article key={s.id} className="rounded-md border border-stone-200 bg-white p-4">
              <header className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-medium text-stone-900">{s.title}</h2>
                <div className="flex items-center gap-3 text-xs text-stone-500">
                  <button
                    type="button"
                    onClick={() => view.copy(s)}
                    className="hover:text-emerald-600"
                  >
                    {view.copiedId === s.id ? 'copied' : 'copy'}
                  </button>
                  <button
                    type="button"
                    onClick={() => view.edit(s)}
                    className="hover:text-stone-900"
                  >
                    edit
                  </button>
                  <button
                    type="button"
                    onClick={() => view.remove(s.id)}
                    className="hover:text-rose-600"
                  >
                    delete
                  </button>
                </div>
              </header>
              <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-stone-700">
                {s.body}
              </pre>
              <p className="mt-2 text-[10px] uppercase tracking-wide text-stone-400 tabular-nums">
                updated {new Date(s.updatedAt).toISOString().slice(0, 10)}
              </p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
