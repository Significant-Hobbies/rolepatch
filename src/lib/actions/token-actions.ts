'use server';

import { db } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth-utils';
import { v4 as uuid } from 'uuid';

export async function getTokenBalance(): Promise<number> {
  const userId = await getCurrentUserId();
  if (!userId) return 0;
  const result = await db.execute({
    sql: 'SELECT balance FROM token_balances WHERE user_id = ?',
    args: [userId],
  });
  return (result.rows[0]?.balance as number) ?? 0;
}

export async function initializeBalance(userId: string): Promise<void> {
  await db.execute({
    sql: `INSERT OR IGNORE INTO token_balances (user_id, balance, total_purchased, total_used)
          VALUES (?, 3, 0, 0)`,
    args: [userId],
  });
  // Record signup bonus transaction
  const balance = 3;
  await db.execute({
    sql: `INSERT OR IGNORE INTO token_transactions (id, user_id, amount, type, balance_after)
          VALUES (?, ?, 3, 'signup_bonus', ?)`,
    args: [uuid(), userId, balance],
  });
}

export async function debitToken(
  type: 'tailor' | 'cover_letter',
  referenceId: string
): Promise<{ success: true; balance: number } | { success: false; error: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'not_authenticated' };

  // Atomic check-and-decrement
  const result = await db.execute({
    sql: `UPDATE token_balances
          SET balance = balance - 1, total_used = total_used + 1, updated_at = unixepoch()
          WHERE user_id = ? AND balance >= 1
          RETURNING balance`,
    args: [userId],
  });

  if (result.rows.length === 0) {
    return { success: false, error: 'insufficient_tokens' };
  }

  const newBalance = result.rows[0].balance as number;

  // Record transaction
  await db.execute({
    sql: `INSERT INTO token_transactions (id, user_id, amount, type, reference_id, balance_after)
          VALUES (?, ?, -1, ?, ?, ?)`,
    args: [uuid(), userId, type, referenceId, newBalance],
  });

  return { success: true, balance: newBalance };
}

export async function creditTokens(
  userId: string,
  amount: number,
  type: 'purchase' | 'refund' | 'signup_bonus',
  referenceId?: string
): Promise<number> {
  await db.execute({
    sql: `INSERT INTO token_balances (user_id, balance, total_purchased, total_used)
          VALUES (?, ?, ?, 0)
          ON CONFLICT(user_id) DO UPDATE SET
            balance = balance + ?,
            total_purchased = total_purchased + ?,
            updated_at = unixepoch()`,
    args: [userId, amount, amount, amount, amount],
  });

  const result = await db.execute({
    sql: 'SELECT balance FROM token_balances WHERE user_id = ?',
    args: [userId],
  });
  const newBalance = result.rows[0].balance as number;

  await db.execute({
    sql: `INSERT INTO token_transactions (id, user_id, amount, type, reference_id, balance_after)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [uuid(), userId, amount, type, referenceId ?? null, newBalance],
  });

  return newBalance;
}
