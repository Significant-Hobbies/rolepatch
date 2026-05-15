import { ArrowRight, Award, BarChart3, FileText, Globe, MessageSquare, Quote,Search, Shield, Star, Target, Zap } from "lucide-react";
import Link from "next/link";
import Script from "next/script";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "RolePatch",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://rolepatch.com",
  description: "AI-powered resume tailoring with job fit scoring, interview prep, and transparent diff view. See exactly what changed, word by word.",
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

// TODO: replace placeholders with real testimonials
const caseStudies = [
  {
    name: "Anya",
    role: "Senior Backend Engineer",
    atsBefore: 42,
    atsAfter: 87,
    quote: "Three interviews in two weeks after years of silence. The diff view showed me exactly which phrases recruiters were scanning for.",
    outcome: "Offers from Top Fintech",
  },
  {
    name: "Marcus",
    role: "Product Designer",
    atsBefore: 51,
    atsAfter: 92,
    quote: "I kept getting auto-rejected. RolePatch rewrote my impact statements around the exact signals each team was hiring for.",
    outcome: "Public FAANG Interview",
  },
  {
    name: "Priya",
    role: "Data Scientist",
    atsBefore: 38,
    atsAfter: 89,
    quote: "The fit score told me which roles were actually worth applying to. I stopped wasting weekends on long-shots and focused where I had edge.",
    outcome: "Hired at Series B Startup",
  },
];

const builtOn = ["Next.js", "Turso", "Vercel", "Anthropic"];

export const revalidate = 3600;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#f0f0f0] font-sans selection:bg-indigo-500/30 selection:text-white">
      <Script
        id="rolepatch-structured-data"
        strategy="beforeInteractive"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-xs font-black text-white">RP</span>
            <span className="font-bold text-xl tracking-tight text-white">RolePatch</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/50">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#case-studies" className="hover:text-white transition-colors">Results</a>
            <Link href="/tools" className="hover:text-white transition-colors">Free Tools</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          </nav>
          <Link
            href="/dashboard"
            className="bg-white text-black text-sm font-bold px-6 py-2.5 rounded-full hover:bg-white/90 transition-all"
          >
            Get Started Free
          </Link>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative pt-32 pb-28 px-6 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/10 blur-[100px] animate-pulse delay-1000" />
          </div>

          <div className="relative max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold tracking-widest uppercase text-indigo-400 mb-10">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Next-Gen AI Tailoring
            </div>

            <h1 className="text-7xl md:text-[100px] font-bold leading-[0.9] tracking-tight mb-10">
              The AI that gets you <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400">more interviews.</span>
            </h1>

            <p className="text-xl md:text-2xl text-white/60 max-w-2xl mx-auto leading-relaxed font-medium mb-12">
              Don&apos;t just apply. Score your fit, tailor your resume, and prep for interviews — all from one AI-powered command center.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
              <Link
                href="/dashboard"
                className="group relative px-10 py-5 bg-white text-black font-black text-lg rounded-2xl hover:scale-105 transition-all duration-300 shadow-[0_20px_50px_rgba(255,255,255,0.1)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative group-hover:text-white transition-colors">Start Building Now — It&apos;s Free</span>
              </Link>
              <a
                href="#features"
                className="px-10 py-5 bg-white/5 text-white font-bold text-lg rounded-2xl border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2"
              >
                See Features <Zap className="w-5 h-5 fill-current" />
              </a>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
              <div className="max-w-2xl">
                <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">Built for speed, <br/> tuned for precision.</h2>
                <p className="text-xl text-white/50 leading-relaxed font-medium">AI that understands what recruiters are actually looking for.</p>
              </div>
              <div className="flex gap-4">
                <div className="px-6 py-4 rounded-3xl bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold text-white">98%</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40">ATS Score Avg</div>
                </div>
                <div className="px-6 py-4 rounded-3xl bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold text-white">2.4s</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40">Tailor Speed</div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Target, title: "Job Fit Score", desc: "AI evaluates your match across 5 weighted dimensions — role alignment, skills, experience level, keywords, and culture fit. Know before you apply." },
                { icon: Zap, title: "Contextual Rewriting", desc: "Our AI doesn't just swap words; it re-contextualizes your experience to match the role's needs. See every change in a word-level diff." },
                { icon: MessageSquare, title: "Interview Prep", desc: "Auto-generates STAR+R stories mapped to the job requirements. Walk into every interview with rehearsed, quantified answers." },
                { icon: Search, title: "Deep JD Analysis", desc: "Extracts hard skills, soft skills, and cultural nuances from any job posting. Paste a URL and we scrape the rest." },
                { icon: BarChart3, title: "ATS Optimization", desc: "Real-time keyword scoring shows exactly which terms you're hitting and missing. Close the gap before you submit." },
                { icon: FileText, title: "Cover Letters", desc: "AI-generated cover letters with company research baked in. Maps your proof points directly to their requirements." },
              ].map((f, i) => (
                <div key={i} className="group p-8 rounded-3xl bg-[#0c0c0c] border border-white/5 hover:border-indigo-500/50 transition-all duration-500 hover:translate-y-[-4px]">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform duration-500">
                    <f.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                  <p className="text-white/50 leading-relaxed font-medium">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Social Proof / Case Studies ── */}
        <section id="case-studies" className="py-32 px-6 border-t border-[var(--border)]">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-2xl mb-20">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--muted)] border border-[var(--border)] text-[10px] font-bold tracking-widest uppercase text-[var(--accent)] mb-6">
                <Award className="w-3 h-3" />
                Proof, not promises
              </div>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-[var(--foreground)]">
                Real results from<br /> real candidates.
              </h2>
              <p className="text-xl text-[var(--muted-foreground)] leading-relaxed font-medium">
                Before and after ATS scores from candidates who used RolePatch to land interviews they&apos;d been chasing for months.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {caseStudies.map((c, i) => {
                const delta = c.atsAfter - c.atsBefore;
                return (
                  <article
                    key={i}
                    className="flex flex-col p-8 rounded-3xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)]/40 transition-colors duration-500"
                  >
                    <header className="mb-6">
                      <div className="text-lg font-bold text-[var(--foreground)]">{c.name}</div>
                      <div className="text-sm font-medium text-[var(--muted-foreground)]">{c.role}</div>
                    </header>

                    {/* Before → After ATS visualization */}
                    <div className="mb-6" aria-label={`ATS score improved from ${c.atsBefore} to ${c.atsAfter}`}>
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                        <span>ATS Score</span>
                        <span className="text-[var(--accent)]">+{delta} pts</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-[var(--muted-foreground)] mb-1">{c.atsBefore}</span>
                          <div className="w-14 h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                            <div
                              className="h-full bg-[var(--muted-foreground)]/50"
                              style={{ width: `${c.atsBefore}%` }}
                            />
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />
                        <div className="flex flex-col items-center flex-1">
                          <span className="text-xs font-bold text-[var(--accent)] mb-1">{c.atsAfter}</span>
                          <div className="w-full h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                            <div
                              className="h-full bg-[var(--accent)]"
                              style={{ width: `${c.atsAfter}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <blockquote className="relative text-[var(--foreground)]/80 italic leading-relaxed font-medium mb-6 flex-1">
                      <Quote className="w-4 h-4 text-[var(--muted-foreground)] mb-2" aria-hidden="true" />
                      {c.quote}
                    </blockquote>

                    <div className="inline-flex self-start items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[11px] font-bold text-[var(--accent)]">
                      <Award className="w-3 h-3" />
                      {c.outcome}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Built on — understated tech stack row */}
            <div className="mt-24 pt-10 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
                Built on
              </span>
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 grayscale opacity-60">
                {builtOn.map((tech) => (
                  <span
                    key={tech}
                    className="text-sm font-semibold text-[var(--muted-foreground)] tracking-tight"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-20 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-16 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2.5 mb-6">
                <span className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center text-[9px] font-black text-white">RP</span>
                <span className="font-bold text-lg tracking-tight">RolePatch</span>
              </div>
              <p className="text-white/40 max-w-sm leading-relaxed font-medium">
                AI-powered resume tailoring. Score your fit, tailor your resume, prep for interviews.
              </p>
            </div>
            <div className="space-y-5">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/20">Product</h4>
              <nav className="flex flex-col gap-3 text-sm text-white/50 font-medium">
                <Link href="/tools" className="hover:text-white transition-colors">Free Tools</Link>
                <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
                <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
              </nav>
            </div>
            <div className="space-y-5">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/20">Legal</h4>
              <nav className="flex flex-col gap-3 text-sm text-white/50 font-medium">
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              </nav>
            </div>
          </div>
          <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-white/20 font-medium">
              &copy; {new Date().getFullYear()} RolePatch. Built for the modern job seeker.
            </p>
            <div className="flex gap-6 opacity-20 hover:opacity-100 transition-opacity">
              <Globe className="w-5 h-5 cursor-pointer" />
              <Shield className="w-5 h-5 cursor-pointer" />
              <Star className="w-5 h-5 cursor-pointer" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
