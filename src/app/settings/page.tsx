import { ExtensionSetupCard } from '@/components/extension-setup-card';
import { OperationalReadinessCard } from '@/components/operational-readiness-card';
import { SettingsForm } from '@/components/settings-form';
import { ResumeApiAccess } from '@/components/resume-api-access';
import { ResumeOAuthConsent } from '@/components/resume-oauth-consent';
import { getOperationalReadiness } from '@/lib/operational-readiness';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const readiness = await getOperationalReadiness();

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-2">
          Choose your AI provider and check which features are available.
        </p>
      </div>
      <div className="space-y-6">
        <ResumeOAuthConsent />
        <OperationalReadinessCard readiness={readiness} />
        <ExtensionSetupCard />
        <SettingsForm />
        <ResumeApiAccess />
      </div>
    </main>
  );
}
