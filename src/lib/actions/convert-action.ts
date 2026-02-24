'use server';

import { generateText } from 'ai';
import { getAIProvider } from '@/lib/ai';

const SYSTEM_PROMPT = `You convert LaTeX resumes to Typst. Return ONLY valid Typst source code. No markdown fences, no explanation.

Key conversions:
- \\documentclass, \\usepackage, \\begin{document}, \\end{document} → remove (Typst needs none of these)
- Page setup → #set page(paper: "us-letter", margin: (x: 0.5in, y: 0.5in))
- \\textbf{X} → *X*
- \\textit{X} or \\emph{X} → _X_
- \\href{url}{text} → #link("url")[text]
- \\section{Title} → = Title
- \\begin{itemize} ... \\item X ... \\end{itemize} → #list([X], [Y])
- \\begin{tabular*} with l@{\\extracolsep{\\fill}}r → #grid(columns: (1fr, auto), [...], [...])
- \\vspace{-4pt} → #v(-4pt)
- \\hspace or \\quad → #h(6pt)
- \\footnotesize → text(size: 8pt)[...]
- \\small → text(size: 9pt)[...]
- \\Huge → text(size: 22pt)[...]
- \\scshape → smallcaps[...]
- \\titlerule → #line(length: 100%, stroke: 0.5pt)
- @ must be escaped as \\@ inside content blocks
- LaTeX comments (% ...) → Typst comments (// ...)
- \\& → &
- \\% → %

Use #let for repeated patterns. Example for resume subheadings:

#let subheading(title, date, subtitle, location) = {
  v(-2pt)
  grid(columns: (1fr, auto), text(weight: "bold")[#title], text[#date])
  grid(columns: (1fr, auto), text(style: "italic", size: 9pt)[#subtitle], text(style: "italic", size: 9pt)[#location])
  v(-4pt)
}

For section heading styling:

#show heading.where(level: 1): it => {
  v(-4pt)
  text(size: 12pt, weight: "bold", smallcaps(it.body))
  v(-8pt)
  line(length: 100%, stroke: 0.5pt)
  v(-5pt)
}

Preserve ALL content exactly — every bullet point, date, company name, and link.`;

export async function convertLatexToTypst(latexSource: string): Promise<string> {
  const { provider, model } = getAIProvider();

  const { text } = await generateText({
    model: provider(model),
    system: SYSTEM_PROMPT,
    prompt: `Convert this LaTeX resume to Typst:\n\n${latexSource}`,
  });

  // Strip markdown fences if the model wrapped it
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:typst)?\n?/, '').replace(/\n?```$/, '');
  }

  return cleaned;
}
