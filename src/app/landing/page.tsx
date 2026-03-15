import Link from "next/link";

export const metadata = {
  title: "Resume Tailor – AI-Powered Resume Tailoring",
  description:
    "Tailor your resume to any job description in seconds with AI. Land more interviews.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-lg tracking-tight">Resume Tailor</span>
          <nav className="hidden sm:flex items-center gap-8 text-sm text-gray-600 dark:text-gray-400">
            <a href="#features" className="hover:text-gray-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-gray-900 dark:hover:text-white transition-colors">How it works</a>
          </nav>
          <Link
            href="/"
            className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Get started free →
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-24 px-6">
        {/* subtle gradient blob */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 flex justify-center"
        >
          <div className="w-[800px] h-[500px] rounded-full bg-green-400/20 dark:bg-green-500/10 blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto text-center space-y-6">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 px-3 py-1 rounded-full border border-green-200 dark:border-green-800">
            AI-powered ✦ Instant results
          </span>

          <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight tracking-tight">
            Your resume,{" "}
            <span className="text-green-600 dark:text-green-400">
              tailored perfectly
            </span>{" "}
            for every job.
          </h1>

          <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Paste a job description and let AI rewrite your resume to match — in
            seconds. See exactly what changed with a live diff, then apply with
            confidence.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/"
              className="bg-green-600 hover:bg-green-500 text-white font-semibold px-8 py-3 rounded-xl text-lg shadow-lg shadow-green-600/20 transition-all hover:shadow-green-500/30 hover:-translate-y-0.5"
            >
              Start tailoring — it's free
            </Link>
            <a
              href="#how-it-works"
              className="border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 font-medium px-8 py-3 rounded-xl text-lg transition-colors"
            >
              See how it works
            </a>
          </div>

          <p className="text-sm text-gray-400 dark:text-gray-600">
            No credit card required · Try as a guest
          </p>
        </div>

        {/* ── Mock UI Preview ── */}
        <div className="relative max-w-5xl mx-auto mt-16">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shadow-2xl overflow-hidden">
            {/* fake browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="w-3 h-3 rounded-full bg-green-400" />
              <span className="ml-3 flex-1 text-xs text-center text-gray-400 bg-gray-100 dark:bg-gray-800 rounded px-4 py-1">
                resume-tailor.app
              </span>
            </div>
            {/* fake app content */}
            <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-800 min-h-[320px]">
              {/* left: original */}
              <div className="p-6 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Original Resume</p>
                <div className="space-y-2">
                  {["Software Engineer with 5 years experience","Worked on backend APIs","Used various cloud services","Led small team projects"].map((line, i) => (
                    <div key={i} className="h-4 rounded bg-gray-200 dark:bg-gray-800" style={{ width: `${70 + (i % 3) * 10}%` }}>
                      <span className="sr-only">{line}</span>
                    </div>
                  ))}
                  <div className="mt-4 space-y-2">
                    {[85, 60, 75, 50].map((w, i) => (
                      <div key={i} className="h-3 rounded bg-gray-100 dark:bg-gray-700/60" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                </div>
              </div>
              {/* right: tailored */}
              <div className="p-6 space-y-3 bg-white dark:bg-gray-900">
                <p className="text-xs font-semibold uppercase tracking-widest text-green-600 dark:text-green-400">Tailored Resume ✓</p>
                <div className="space-y-2">
                  {[
                    { text: "Senior Software Engineer – 5 yrs", color: "bg-green-100 dark:bg-green-900/40" },
                    { text: "Built scalable REST & GraphQL APIs", color: "bg-green-100 dark:bg-green-900/40" },
                    { text: "AWS / GCP cloud infrastructure", color: "bg-yellow-100 dark:bg-yellow-900/30" },
                    { text: "Managed cross-functional teams", color: "bg-green-100 dark:bg-green-900/40" },
                  ].map((line, i) => (
                    <div key={i} className={`h-4 rounded ${line.color}`} style={{ width: `${70 + (i % 3) * 10}%` }} />
                  ))}
                  <div className="mt-4 space-y-2">
                    {[85, 60, 75, 50].map((w, i) => (
                      <div key={i} className="h-3 rounded bg-gray-100 dark:bg-gray-800" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">+12 improvements</span>
                </div>
              </div>
            </div>
          </div>
          {/* glow under card */}
          <div aria-hidden className="absolute -bottom-8 inset-x-0 flex justify-center">
            <div className="w-2/3 h-12 bg-green-500/20 blur-2xl rounded-full" />
          </div>
        </div>
      </section>

      {/* ── Social proof strip ── */}
      <section className="py-10 border-y border-gray-100 dark:border-gray-900 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          {[
            "🎯 Matches keywords automatically",
            "⚡ Results in under 10 seconds",
            "📄 Keeps your original formatting",
            "🔒 Your data stays private",
          ].map((item) => (
            <span key={item} className="font-medium">{item}</span>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-4xl font-bold">Everything you need to land the job</h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
              From tailoring to cover letters — Resume Tailor handles every step.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: "✨",
                title: "AI Resume Tailoring",
                desc: "Paste any job description and our AI rewrites your resume to highlight the most relevant skills and experience.",
                accent: "green",
              },
              {
                icon: "🔍",
                title: "Live Diff View",
                desc: "See exactly what changed — additions highlighted in green, removals in red. Full transparency, no surprises.",
                accent: "blue",
              },
              {
                icon: "📝",
                title: "Cover Letter Generator",
                desc: "Generate a compelling, personalised cover letter for each application with one click.",
                accent: "purple",
              },
              {
                icon: "📋",
                title: "Resume Manager",
                desc: "Store multiple versions of your resume. Create tailored variants without touching your original.",
                accent: "orange",
              },
              {
                icon: "💼",
                title: "Job Application Tracker",
                desc: "Track every application in one place — draft, tailored, applied. Never lose track of where you've applied.",
                accent: "pink",
              },
              {
                icon: "🗂️",
                title: "Stash",
                desc: "Save your best resume snippets and reuse them across applications. Build your personal library of wins.",
                accent: "teal",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:border-green-400 dark:hover:border-green-600 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 bg-white dark:bg-gray-900"
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 px-6 bg-gray-50 dark:bg-gray-900/40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-4xl font-bold">Ready in 3 simple steps</h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              From cold resume to tailored application in under a minute.
            </p>
          </div>

          <div className="space-y-8">
            {[
              {
                step: "01",
                title: "Upload your resume",
                desc: "Paste your existing resume in markdown or plain text. You can store multiple versions for different roles.",
              },
              {
                step: "02",
                title: "Add the job description",
                desc: "Paste the job posting URL or text. Resume Tailor scrapes and analyses the requirements automatically.",
              },
              {
                step: "03",
                title: "Review, edit & apply",
                desc: "AI tailors your resume, showing a diff of every change. Edit anything you like, then export and apply.",
              },
            ].map((s, i) => (
              <div key={s.step} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-green-600 text-white font-bold text-lg flex items-center justify-center shadow-lg shadow-green-600/20">
                  {s.step}
                </div>
                <div className="pt-1">
                  <h3 className="font-semibold text-xl mb-1">{s.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{s.desc}</p>
                </div>
                {i < 2 && (
                  <div aria-hidden className="hidden lg:block absolute ml-6 mt-14 w-0.5 h-8 bg-gray-200 dark:bg-gray-800" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold">Loved by job seekers</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                quote: "I went from 0 callbacks to 3 interviews in a week. The diff view is a game changer.",
                name: "Alex T.",
                role: "Software Engineer",
              },
              {
                quote: "Finally a tool that doesn't just keyword-stuff. The tailoring actually reads naturally.",
                name: "Priya M.",
                role: "Product Manager",
              },
              {
                quote: "The cover letter generator saved me hours. Each one actually sounds like me.",
                name: "Jordan K.",
                role: "UX Designer",
              },
            ].map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4"
              >
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">"{t.quote}"</p>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-gray-400 text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="rounded-3xl bg-green-600 dark:bg-green-700 p-12 shadow-2xl shadow-green-600/20">
            <h2 className="text-4xl font-extrabold text-white mb-4">
              Start tailoring your resume today
            </h2>
            <p className="text-green-100 text-lg mb-8">
              Free to use. No account needed to try it out.
            </p>
            <Link
              href="/"
              className="inline-block bg-white text-green-700 font-bold px-10 py-4 rounded-xl text-lg hover:bg-green-50 transition-colors shadow-lg"
            >
              Get started free →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <span className="font-semibold text-gray-700 dark:text-gray-300">Resume Tailor</span>
          <span>© {new Date().getFullYear()} Resume Tailor. All rights reserved.</span>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">App</Link>
            <Link href="/settings" className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">Settings</Link>
            <Link href="/stash" className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">Stash</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
