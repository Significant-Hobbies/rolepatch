import { Webhook } from 'standardwebhooks';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { creditTokens } from '@/lib/actions/token-actions';
import { getTokensForProduct } from '@/lib/token-config';

export async function POST(request: Request) {
  const headersList = await headers();
  const rawBody = await request.text();

  // Verify webhook signature
  const webhookHeaders = {
    'webhook-id': headersList.get('webhook-id') ?? '',
    'webhook-signature': headersList.get('webhook-signature') ?? '',
    'webhook-timestamp': headersList.get('webhook-timestamp') ?? '',
  };

  try {
    const wh = new Webhook(process.env.DODO_PAYMENTS_WEBHOOK_KEY!);
    wh.verify(rawBody, webhookHeaders);
  } catch {
    return new Response('Invalid signature', { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const eventType: string = payload.type;

  if (eventType === 'payment.succeeded') {
    const data = payload.data;
    const paymentId: string | undefined = data?.payment_id;
    const userId: string | undefined = data?.metadata?.user_id;
    const totalAmount: number = data?.total_amount ?? 0;
    const currency: string = data?.currency ?? 'USD';

    // Extract product_id from the cart (we only ever send 1 item)
    const productId: string | undefined = data?.product_cart?.[0]?.product_id;

    if (!userId || !productId || !paymentId) {
      return new Response('Missing required fields', { status: 400 });
    }

    const tokensToGrant = getTokensForProduct(productId);
    if (!tokensToGrant) {
      return new Response('Unknown product', { status: 400 });
    }

    // Idempotent: check if payment already processed
    const existing = await db.execute({
      sql: 'SELECT id FROM payments WHERE id = ?',
      args: [paymentId],
    });
    if (existing.rows.length > 0) {
      return new Response('Already processed', { status: 200 });
    }

    // Record payment with raw payload for dispute evidence
    await db.execute({
      sql: `INSERT INTO payments (id, user_id, product_id, amount_cents, currency, tokens_granted, status, dodo_payload)
            VALUES (?, ?, ?, ?, ?, ?, 'completed', ?)`,
      args: [
        paymentId,
        userId,
        productId,
        totalAmount,
        currency,
        tokensToGrant,
        rawBody,
      ],
    });

    // Credit tokens to user
    await creditTokens(userId, tokensToGrant, 'purchase', paymentId);
  }

  if (eventType === 'refund.succeeded') {
    const data = payload.data;
    const paymentId: string | undefined = data?.payment_id;

    if (!paymentId) {
      return new Response('Missing payment_id', { status: 400 });
    }

    const payment = await db.execute({
      sql: 'SELECT user_id, tokens_granted FROM payments WHERE id = ? AND status = ?',
      args: [paymentId, 'completed'],
    });

    if (payment.rows.length > 0) {
      const row = payment.rows[0];
      const userId = row.user_id as string;
      const tokensToRevoke = row.tokens_granted as number;

      // Deduct tokens (floor at 0 to avoid negative balance)
      await db.execute({
        sql: `UPDATE token_balances
              SET balance = MAX(0, balance - ?), updated_at = unixepoch()
              WHERE user_id = ?`,
        args: [tokensToRevoke, userId],
      });

      await db.execute({
        sql: `UPDATE payments SET status = 'refunded' WHERE id = ?`,
        args: [paymentId],
      });
    }
  }

  return new Response('OK', { status: 200 });
}
