import type { Metadata } from 'next';
import { preload } from 'react-dom';

import { PublicPricingView } from '@/components/public-pricing-view';
import { getTokenBalance } from '@/lib/actions/token-actions';
import { getCurrentUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Token-based pricing for AI resume tailoring. Start with 3 free tokens. No subscription required.',
  alternates: { canonical: 'https://rolepatch.com/pricing' },
};

async function hasRecentPayment(): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const result = await db.execute({
    sql: `SELECT id FROM payments WHERE user_id = ? AND status = 'completed' AND created_at > unixepoch() - 300 LIMIT 1`,
    args: [userId],
  });
  return result.rows.length > 0;
}

export default async function PricingPage() {
  preload('/fonts/space-grotesk-public-700.woff2', {
    as: 'font',
    type: 'font/woff2',
    crossOrigin: '',
  });
  const [balance, paymentVerified] = await Promise.all([getTokenBalance(), hasRecentPayment()]);

  return <PublicPricingView balance={balance} paymentVerified={paymentVerified} />;
}
