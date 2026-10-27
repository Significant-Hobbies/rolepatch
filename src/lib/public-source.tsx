import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  FileCheck2,
  GitCompare,
  Hash,
  Link2,
  ListChecks,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { createElement, type ReactNode } from 'react';
import { PUBLIC_SURFACES } from '../../public-surfaces.mjs';
import BlogPage from '@/app/blog/page';
import PrivacyPage from '@/app/privacy/page';
import TermsPage from '@/app/terms/page';
import ToolsPage from '@/app/tools/page';
import { DiffToolPageView } from '@/app/tools/diff/page-view';
import { KeywordsToolPageView } from '@/app/tools/keywords/page-view';
import { AtsCheckPageView } from '@/app/tools/ats-check/page-view';
import { BulletCheckPageView } from '@/app/tools/bullet-check/page-view';
import { PLACEHOLDER, analyzeBullet } from '@/app/tools/bullet-check/analysis';
import { WordCountPageView } from '@/app/tools/word-count/page-view';
import { SnippetsPageView } from '@/app/tools/snippets/page-view';
import {
  ProofProjectOverview,
  OverviewProofMetric,
  ProofRow,
} from '@/components/proof-project-overview';
import { ProofPacketPreviewView, ProofMetric } from '@/components/proof-packet-preview-view';
import { TrueHireProofPreviewView } from '@/components/truehire-proof-preview-view';
import { PublicPricingView } from '@/components/public-pricing-view';
import { PricingCards } from '@/components/pricing-cards';
import { PricingCardsView } from '@/components/pricing-cards-view';
import { blogPostBySlug } from '@/lib/blog-posts';
import { buildProofPacketPreview } from '@/lib/achievement-evidence';
import { absoluteMarkdownLinks } from './agent-surfaces/format.mjs';
import { reactSourceMarkdown } from './react-source-markdown';
import { publicEditorialMarkdown } from './public-editorial-source';

const origin = 'https://rolepatch.com';
const noop = () => {};
const asyncNoop = async () => {};
const bullets = PLACEHOLDER.split(/\n+/)
  .map((line) => line.replace(/^[-•*\s]+/, '').trim())
  .filter(Boolean)
  .map(analyzeBullet);
const toolNodes: Record<string, () => ReactNode> = {
  '/tools/diff': () => (
    <DiffToolPageView
      versionA=""
      versionB=""
      compared={false}
      splitView
      canCompare={false}
      additions={0}
      removals={0}
      setVersionA={noop}
      setVersionB={noop}
      setCompared={noop}
      setSplitView={noop}
    />
  ),
  '/tools/keywords': () => (
    <KeywordsToolPageView
      resumeText=""
      jdText=""
      result={null}
      canAnalyze={false}
      setResumeText={noop}
      setJdText={noop}
      setResult={noop}
      handleAnalyze={noop}
    />
  ),
  '/tools/ats-check': () => <AtsCheckPageView text="" result={null} setText={noop} />,
  '/tools/bullet-check': () => (
    <BulletCheckPageView
      text={PLACEHOLDER}
      bullets={bullets}
      avg={Math.round(bullets.reduce((sum, bullet) => sum + bullet.score, 0) / bullets.length)}
      setText={noop}
    />
  ),
  '/tools/word-count': () => <WordCountPageView text="" stats={null} setText={noop} />,
  '/tools/snippets': () => (
    <SnippetsPageView
      title=""
      body=""
      snips={[]}
      editingId={null}
      copiedId={null}
      setTitle={noop}
      setBody={noop}
      setEditingId={noop}
      submit={noop}
      copy={asyncNoop}
      edit={noop}
      remove={noop}
    />
  ),
};
const pricing = () => (
  <PricingCardsView
    paymentVerified={false}
    isGuest
    error={null}
    loadingPack={null}
    handleGuestSignIn={noop}
    handleBuy={asyncNoop}
  />
);
const proof = () => (
  <ProofProjectOverview
    proofPreview={
      <>
        <ProofPacketPreviewView
          shareableCount={0}
          needsWorkCount={0}
          copyState="idle"
          hasEvidence={false}
          preview={buildProofPacketPreview([])}
          copyProofProfile={asyncNoop}
        />
        <TrueHireProofPreviewView
          handle=""
          jobDescription=""
          isLoading={false}
          isRoleFitLoading={false}
          isImporting={false}
          error={null}
          roleFitError={null}
          notice={null}
          preview={null}
          roleFit={null}
          setHandle={noop}
          setJobDescription={noop}
          loadPreview={asyncNoop}
          loadRoleFit={asyncNoop}
          importPreview={asyncNoop}
        />
      </>
    }
  />
);

const components = [
  BlogPage,
  PrivacyPage,
  TermsPage,
  ToolsPage,
  DiffToolPageView,
  KeywordsToolPageView,
  AtsCheckPageView,
  BulletCheckPageView,
  WordCountPageView,
  SnippetsPageView,
  ProofProjectOverview,
  OverviewProofMetric,
  ProofRow,
  ProofPacketPreviewView,
  ProofMetric,
  TrueHireProofPreviewView,
  PublicPricingView,
  PricingCardsView,
];
const adapters = new Map<
  unknown,
  (props: Record<string, unknown> & { children?: ReactNode }) => ReactNode
>([
  [Link, (props) => createElement('a', props, props.children)],
  [PricingCards, pricing],
  ...[
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    CheckSquare,
    FileCheck2,
    GitCompare,
    Hash,
    Link2,
    ListChecks,
    Search,
    ShieldCheck,
    Sparkles,
  ].map((icon) => [icon, () => null] as const),
]);

/** Only empty anonymous views and authored public source are reachable here. */
export function publicSourceMarkdown(path: string): string | null {
  const surface = PUBLIC_SURFACES.find((item) => item.path === path);
  if (!surface) return null;
  let body = publicEditorialMarkdown(path);
  if (path.startsWith('/blog/')) {
    const post = blogPostBySlug(path.slice('/blog/'.length));
    if (!post) return null;
    body = `# ${post.title}\n\n${new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · ${post.readTime} read\n\n${post.content}`;
  }
  if (!body) {
    const node =
      toolNodes[path]?.() ??
      (
        {
          '/privacy': <PrivacyPage />,
          '/terms': <TermsPage />,
          '/tools': <ToolsPage />,
          '/blog': <BlogPage />,
          '/proof': proof(),
          '/pricing': <PublicPricingView balance={0} paymentVerified={false} />,
        } as Record<string, ReactNode>
      )[path];
    if (!node) return null;
    body = reactSourceMarkdown(node, { origin, components, adapters, includeFormDefaults: true });
  }
  return absoluteMarkdownLinks(`Canonical: ${origin}${path}\n\n${body}\n`, `${origin}${path}`);
}
