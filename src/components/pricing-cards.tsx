'use client';

import { PricingCardsView } from './pricing-cards-view';

import { useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { authClient } from '@/lib/auth-client';
import { captureAuthFailure } from '@/lib/foundry-monitoring';

export function usePricingCardsSourceState({ paymentVerified }: { paymentVerified: boolean }) {
  const { isGuest } = useAuth();
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy(packId: string) {
    setError(null);
    setLoadingPack(packId);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Checkout failed');
      }
      const { checkout_url } = await res.json();
      window.location.href = checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoadingPack(null);
    }
  }

  function handleGuestSignIn() {
    authClient.signIn
      .social({ provider: 'google', callbackURL: '/pricing' })
      .then((result) => {
        if (result?.error) {
          captureAuthFailure({
            projectSlug: 'resume-tailor',
            provider: 'google',
            stage: 'signin',
            reason: result.error.message ?? 'Google sign-in failed',
            source: 'pricing-cards',
          });
        }
      })
      .catch((error: unknown) => {
        captureAuthFailure({
          projectSlug: 'resume-tailor',
          provider: 'google',
          stage: 'signin',
          reason: error instanceof Error ? error.message : 'Google sign-in failed',
          source: 'pricing-cards',
        });
      });
  }

  return { paymentVerified, error, isGuest, handleGuestSignIn, handleBuy, loadingPack };
}

export function PricingCards(props: Parameters<typeof usePricingCardsSourceState>[0]) {
  return <PricingCardsView {...usePricingCardsSourceState(props)} />;
}
