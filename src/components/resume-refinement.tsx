'use client';

import { useRef, useState, useTransition } from 'react';
import { refineResumeSectionForClient } from '@/lib/actions/refine-resume-action';
import { markdownToHtml } from '@/lib/resume-html';
import {
  listRefinementTargets,
  type RefinementTarget,
  type ResumeDraft,
} from '@/lib/resume-refinement';
import type { AIProviderConfig } from '@/lib/types';

type RefinementState =
  | { status: 'idle' }
  | { status: 'pending'; before: ResumeDraft }
  | { status: 'error'; message: string }
  | { status: 'ready'; before: ResumeDraft; candidate: ResumeDraft }
  | { status: 'applied'; before: ResumeDraft; after: ResumeDraft };
interface Props {
  masterSource: string;
  draft: ResumeDraft;
  jdText: string;
  isGuest: boolean;
  disabled: boolean;
  hasCredits: boolean;
  aiConfig: () => AIProviderConfig;
  onChange: (draft: ResumeDraft) => void;
  onConsumed: () => void;
}

async function requestRefinement(
  props: Props,
  instruction: string,
  target: RefinementTarget
): Promise<RefinementState> {
  const before = props.draft;
  try {
    const result = await refineResumeSectionForClient({
      masterSource: props.masterSource,
      currentSource: before.source,
      jdText: props.jdText,
      instruction,
      target,
      aiConfig: props.aiConfig(),
    });
    if (!result.success) return { status: 'error', message: result.error };
    if (result.data.tailored === before.source)
      return {
        status: 'error',
        message:
          'The current section already follows this order or wording. No change was applied.',
      };
    const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();
    const candidateSource = normalize(result.data.tailored);
    const retainedChanges = before.changes.filter((change) => {
      const snippet = normalize(change.snippet);
      return snippet.length > 0 && candidateSource.includes(snippet);
    });
    return {
      status: 'ready',
      before,
      candidate: {
        source: result.data.tailored,
        changes: [...result.data.changes, ...retainedChanges].slice(0, 12),
      },
    };
  } catch {
    return {
      status: 'error',
      message: 'Could not refine this section. Your current draft is unchanged; try again.',
    };
  } finally {
    props.onConsumed();
  }
}

export function ResumeRefinement(props: Props) {
  const [state, setState] = useState<RefinementState>({ status: 'idle' });
  const [selection, setSelection] = useState('summary');
  const [instruction, setInstruction] = useState('');
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const options = listRefinementTargets(props.draft.source);
  const selected = options.find((option) => option.value === selection) ?? options[0];
  function propose() {
    if (
      inFlight.current ||
      pending ||
      props.disabled ||
      !props.hasCredits ||
      instruction.trim().length < 3
    )
      return;
    inFlight.current = true;
    setState({ status: 'pending', before: props.draft });
    startTransition(async () => {
      try {
        setState(await requestRefinement(props, instruction, selected.target));
      } finally {
        inFlight.current = false;
      }
    });
  }
  return (
    <details className="border-b border-border px-4 py-3">
      <summary className="min-h-11 cursor-pointer content-center text-sm font-medium">
        Refine one section
      </summary>
      <div className="space-y-3 pb-2 pt-2">
        <p className="text-sm text-muted-foreground">
          Refine the summary or reorder approved points. Achievement wording stays fixed.{' '}
          {props.isGuest ? 'Guest draft stays in this browser.' : 'Each proposal uses 1 token.'}
        </p>
        <RefinementForm
          options={options}
          selection={selected.value}
          instruction={instruction}
          disabled={pending || props.disabled}
          onSelection={(value) => {
            setSelection(value);
            setState({ status: 'idle' });
          }}
          onInstruction={(value) => {
            setInstruction(value);
            if (!pending) setState({ status: 'idle' });
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={propose}
            disabled={
              props.disabled || pending || !props.hasCredits || instruction.trim().length < 3
            }
            className="min-h-11 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            {pending ? 'Preparing proposal…' : 'Preview refinement'}
          </button>
          <RefinementActions
            state={state}
            source={props.draft.source}
            disabled={props.disabled || pending}
            onState={setState}
            onChange={props.onChange}
          />
        </div>
        {!props.hasCredits && (
          <p className="text-sm text-muted-foreground">
            No tokens remaining. You can still apply or undo an existing proposal.
          </p>
        )}
        <RefinementFeedback state={state} source={props.draft.source} />
      </div>
    </details>
  );
}

function RefinementForm({
  options,
  selection,
  instruction,
  disabled,
  onSelection,
  onInstruction,
}: {
  options: ReturnType<typeof listRefinementTargets>;
  selection: string;
  instruction: string;
  disabled: boolean;
  onSelection: (value: string) => void;
  onInstruction: (value: string) => void;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="min-w-0 text-sm">
          Section
          <select
            value={selection}
            onChange={(event) => onSelection(event.target.value)}
            disabled={disabled}
            className="mt-1 min-h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 text-sm">
          What should change?
          <textarea
            value={instruction}
            onChange={(event) => onInstruction(event.target.value)}
            maxLength={1000}
            rows={2}
            disabled={disabled}
            placeholder="Lead with frontend delivery for this role"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-sm"
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Instructions guide emphasis. Add new facts to your original resume first.
      </p>
    </>
  );
}

function RefinementActions({
  state,
  source,
  disabled,
  onState,
  onChange,
}: {
  state: RefinementState;
  source: string;
  disabled: boolean;
  onState: (state: RefinementState) => void;
  onChange: Props['onChange'];
}) {
  if (state.status === 'ready' && state.before.source === source)
    return (
      <>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            onChange(state.candidate);
            onState({ status: 'applied', before: state.before, after: state.candidate });
          }}
          className="min-h-11 rounded-md border border-input px-3 text-sm font-medium disabled:opacity-40"
        >
          Apply refinement
        </button>
        <button
          type="button"
          onClick={() => onState({ status: 'idle' })}
          className="min-h-11 rounded-md border border-input px-3 text-sm"
        >
          Discard proposal
        </button>
      </>
    );
  if (state.status === 'applied' && state.after.source === source)
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          onChange(state.before);
          onState({ status: 'idle' });
        }}
        className="min-h-11 rounded-md border border-input px-3 text-sm disabled:opacity-40"
      >
        Undo refinement
      </button>
    );
  return null;
}

function RefinementFeedback({ state, source }: { state: RefinementState; source: string }) {
  if (state.status === 'error')
    return (
      <p role="alert" className="text-sm">
        {state.message}
      </p>
    );
  if (state.status === 'applied' && state.after.source === source)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Refinement applied to this draft. Use Accept &amp; Save to keep it in History.
      </p>
    );
  if (state.status !== 'ready') return null;
  if (state.before.source !== source)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Your draft changed while this proposal was prepared. Preview a fresh refinement.
      </p>
    );
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Proposed resume. Review before applying.</p>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {state.candidate.changes.slice(0, 2).map((change, index) => (
          <li key={index}>{change.reason}</li>
        ))}
      </ul>
      <iframe
        title="Refinement preview"
        sandbox=""
        srcDoc={markdownToHtml(state.candidate.source, 'Refinement preview', {
          fontSize: 11,
          margin: 0.5,
        })}
        className="h-80 w-full rounded-md border border-border bg-white"
      />
    </div>
  );
}
