import Link from 'next/link';

const tools = [
  {
    href: '/tools/diff',
    icon: 'Diff',
    title: 'Resume Diff Tool',
    desc: 'Compare two versions of your resume side by side with word-level diff highlighting.',
  },
  {
    href: '/tools/keywords',
    icon: 'ATS',
    title: 'ATS Keyword Checker',
    desc: 'Check how well your resume matches a job description and see matched vs missing keywords.',
  },
];

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-gray-100">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-gray-800/80 bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-[var(--accent)] flex items-center justify-center text-[10px] font-bold text-white">RP</span>
            <span className="font-bold text-lg tracking-tight text-white">ResumeTailor</span>
          </Link>
          <Link
            href="/dashboard"
            className="bg-white text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Get started free
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Free Resume Tools</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            No sign-up required. Use these tools to improve your resume right now.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group rounded-xl border border-gray-800 p-6 hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/[0.02] transition-all duration-200"
            >
              <div className="text-xs font-bold mb-3 w-10 h-10 rounded-lg bg-gray-800/50 flex items-center justify-center text-gray-400">
                {tool.icon}
              </div>
              <h2 className="font-semibold text-white mb-2 text-lg">{tool.title}</h2>
              <p className="text-gray-400 text-sm leading-relaxed">{tool.desc}</p>
              <span className="inline-block mt-4 text-sm text-[var(--accent)] group-hover:translate-x-0.5 transition-transform">
                Use tool &rarr;
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
