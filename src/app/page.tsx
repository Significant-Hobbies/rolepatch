import Link from "next/link";
import { Check, ArrowRight, Zap, Star, Shield, Search, FileText, Layout, BarChart3, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ResumeTailor",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://resumetailor.com",
  description: "AI-powered resume tailoring with transparent diff view. See exactly what changed, word by word.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "3 free tokens to start. No credit card required.",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "120",
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent/30 selection:text-accent-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ── Diff animation keyframes ── */}
      <style>{`
        @keyframes highlightFadeIn {
          0% { opacity: 0; background-color: transparent; }
          100% { opacity: 1; background-color: var(--accent); opacity: 0.1; }
        }
        @keyframes badgeCountUp {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .diff-highlight {
          animation: highlightFadeIn 0.6s ease-out forwards;
          opacity: 0;
          color: var(--accent);
          background-color: transparent;
          border-radius: 3px;
          padding: 1px 4px;
        }
        .diff-badge {
          animation: badgeCountUp 0.5s ease-out 2.8s forwards;
          opacity: 0;
        }
      `}</style>

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-[12px] font-bold text-primary-foreground shadow-lg shadow-primary/20">RT</span>
            <span className="font-serif font-bold text-xl tracking-tight text-foreground">ResumeTailor</span>
          </div>
          <nav className="hidden sm:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <Link href="/tools" className="hover:text-foreground transition-colors">Free Tools</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </nav>
          <Link
            href="/dashboard"
            className="bg-primary text-primary-foreground text-sm font-bold px-5 py-2.5 rounded-full hover:opacity-90 transition-all shadow-lg shadow-primary/10"
          >
            {"Get started free \u2192"}
          </Link>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden pt-32 pb-24 px-6">
          {/* gradient mesh background */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-accent/5 blur-[120px]" />
            <div className="absolute top-20 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px]" />
          </div>

          <div className="relative max-w-4xl mx-auto text-center space-y-10">
            <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-accent bg-accent/5 px-5 py-2 rounded-full border border-accent/10">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              AI-powered resume tailoring
            </div>

            <h1 className="font-serif text-6xl sm:text-8xl font-bold leading-[0.95] tracking-tight text-foreground">
              Your resume,{" "}
              <span className="text-accent italic">
                tailored perfectly
              </span>{" "}
              for every job.
            </h1>

            <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
              Paste a job description and let AI rewrite your resume to match — in
              seconds. See exactly what changed, then apply with confidence.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                href="/dashboard"
                className="bg-primary text-primary-foreground font-bold px-8 py-4 rounded-full text-lg hover:scale-[1.02] transition-transform shadow-2xl shadow-primary/20"
              >
                Tailor your resume free
              </Link>
              <a
                href="#how-it-works"
                className="bg-secondary text-secondary-foreground font-bold px-8 py-4 rounded-full text-lg border border-border hover:bg-muted transition-colors"
              >
                See how it works
              </a>
            </div>

            {/* Social proof */}
            <div className="pt-12 flex flex-col items-center gap-6">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold overflow-hidden shadow-sm">
                    <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" />
                  </div>
                ))}
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                <span className="text-foreground font-bold">1,200+</span> professionals already tailoring with ResumeTailor
              </p>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="py-32 px-6 border-t border-border bg-muted/20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-24 space-y-4">
              <h2 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight">The smarter way to apply</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Traditional tailoring takes hours. ResumeTailor does it in seconds with precision AI that respects your experience.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Search, title: "JD Analysis", desc: "Our AI extracts keywords, skills, and requirements directly from any job description." },
                { icon: Zap, title: "Instant Rewriting", desc: "Watch your bullet points transform to match the job's specific language and context." },
                { icon: Shield, title: "Diff View", desc: "See exactly what the AI changed with our industry-first transparent diff engine." }
              ].map((f, i) => (
                <div key={i} className="bg-card p-8 rounded-2xl border border-border/50 hover:border-accent/30 transition-all group shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-accent/5 flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform">
                    <f.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif text-xl font-bold mb-3">{f.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-20 border-t border-border bg-background">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="font-serif font-bold text-2xl tracking-tight text-foreground mb-8">ResumeTailor</div>
          <div className="flex justify-center gap-12 text-sm font-medium text-muted-foreground mb-12">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </div>
          <p className="text-xs text-muted-foreground opacity-50 font-medium">
            &copy; {new Date().getFullYear()} ResumeTailor. Part of the portfolio.
          </p>
        </div>
      </footer>
    </div>
  );
}
