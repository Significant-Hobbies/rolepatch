import type { usePricingCardsSourceState } from './pricing-cards';

const TOKEN_PACKS = [
  {
    id: 'starter' as const,
    name: 'Starter',
    tokens: 10,
    priceLabel: '$5',
    perToken: '$0.50',
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    tokens: 30,
    priceLabel: '$12',
    perToken: '$0.40',
    popular: true,
  },
  {
    id: 'bulk' as const,
    name: 'Bulk',
    tokens: 100,
    priceLabel: '$30',
    perToken: '$0.30',
  },
];

export function PricingCardsView(view: ReturnType<typeof usePricingCardsSourceState>) {
  'use no memo';
  return (
    <div>
      {view.paymentVerified && (
        <div className="mb-8 p-4 rounded-xl border border-green-500/30 bg-[var(--accent)]/10 text-center">
          <p className="text-[var(--accent)] font-medium text-sm">
            Payment successful! Your tokens have been added to your account.
          </p>
        </div>
      )}

      {view.error && (
        <div className="mb-8 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-center">
          <p className="text-red-400 text-sm">{view.error}</p>
        </div>
      )}

      <div className="mb-8 grid gap-3 md:grid-cols-3">
        {[
          {
            title: 'Free reviewed workflow',
            detail:
              'Queue jobs, prepare packets, fill with the extension, and record receipts without spending tokens.',
          },
          {
            title: 'Tokens fund AI work',
            detail:
              'Spend tokens on tailoring, cover letters, fit scoring, interview prep, outreach drafts, and bulk fit scoring.',
          },
          {
            title: 'No subscription',
            detail:
              'Buy packs when needed. Guarded submit stays review-first and does not become unattended bulk apply.',
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-[var(--border)] bg-muted/20 p-4"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">
              {item.title}
            </p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">{item.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TOKEN_PACKS.map((pack) => (
          <div
            key={pack.id}
            className={`relative rounded-xl border p-6 flex flex-col transition-colors ${
              pack.popular
                ? 'border-[var(--accent)]/50 bg-[var(--accent)]/5'
                : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)]/30'
            }`}
          >
            {pack.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[var(--accent)] text-[11px] font-semibold text-white uppercase tracking-wide">
                Popular
              </span>
            )}

            <h3 className="text-lg font-bold text-foreground">{pack.name}</h3>
            <div className="mt-3">
              <span className="text-3xl font-black text-foreground">{pack.priceLabel}</span>
            </div>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              {pack.tokens} tokens &middot; {pack.perToken} each
            </p>

            <div className="mt-6 flex-1" />

            {view.isGuest ? (
              <button
                onClick={view.handleGuestSignIn}
                className="w-full min-h-[44px] py-2.5 rounded-lg text-sm font-medium border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--muted-foreground)] hover:text-foreground transition-colors"
              >
                Sign in to purchase
              </button>
            ) : (
              <button
                onClick={() => view.handleBuy(pack.id)}
                disabled={view.loadingPack !== null}
                className={`w-full min-h-[44px] py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
                  pack.popular
                    ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90'
                    : 'bg-white text-gray-900 hover:bg-gray-200'
                }`}
              >
                {view.loadingPack === pack.id ? 'Redirecting...' : 'Buy'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
