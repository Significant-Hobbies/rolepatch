// Write-only grants may receive persisted identities and revisions, including on a replay.
// Reading the stored document requires the corresponding read operation and grant.
type MutationResult = {
  ok: boolean;
  id?: string;
  revision?: number;
  code?: string;
  error?: string;
  outcomes?: MutationResult[];
};

type WriteReceipt =
  | { ok: true; id?: string; revision?: number }
  | { ok: true; outcomes: WriteReceipt[] }
  | { ok: false; code?: string; error?: string; id?: string; revision?: number };

export function careerWriteResult(result: MutationResult): WriteReceipt {
  if (!result.ok)
    return {
      ok: false,
      code: result.code,
      error: result.error,
      id: result.id,
      revision: result.revision,
    };
  if (result.outcomes) return { ok: true, outcomes: result.outcomes.map(careerWriteResult) };
  return { ok: true, id: result.id, revision: result.revision };
}
