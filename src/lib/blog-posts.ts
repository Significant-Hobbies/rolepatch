export interface BlogPost {
  slug: string;
  title: string;
  seoTitle?: string;
  description: string;
  date: string; // ISO date (YYYY-MM-DD)
  readTime: string;
  content: string; // markdown-ish
}

/**
 * Single source of truth for blog post metadata + content.
 * Consumed by the blog index, the [slug] post page, and the RSS feed.
 */
export const blogPosts: BlogPost[] = [
  {
    slug: 'why-tailoring-resume-matters',
    title: 'Why Tailoring Your Resume for Every Job Actually Works',
    seoTitle: 'Why Tailored Resumes Work | RolePatch',
    description:
      "Data shows tailored resumes get 3x more interviews. Here's the science behind keyword matching, ATS systems, and what recruiters actually look for.",
    date: '2026-03-16',
    readTime: '5 min',
    content: `## The Numbers Don't Lie

A controlled experiment on Reddit tested identical candidates applying to 58 jobs — 29 with a generic resume and 29 with tailored versions. The result: **5 interviews from tailored applications, 0 from generic ones.**

That's not a marginal improvement. That's the difference between getting interviews and getting nothing.

## How ATS Systems Filter You Out

Over 90% of large companies use Applicant Tracking Systems (ATS) to screen resumes before a human ever sees them. These systems scan for keyword matches between your resume and the job description.

If the job asks for "project management" and your resume says "managed projects," some ATS systems won't catch the match. If the JD emphasizes "Python" and you buried it in line 47, the score drops.

## What "Tailoring" Actually Means

It's not rewriting your entire resume for each job. It's:

1. **Keyword alignment** — using the same terminology as the job description
2. **Priority reordering** — putting the most relevant skills and experiences first
3. **Bullet point tuning** — emphasizing the outcomes that match what the role needs
4. **Removing noise** — cutting irrelevant experience that dilutes your match score

## The Problem: It Takes Forever

At 30 minutes per tailored resume, applying to 5 jobs per day means 2.5 hours just on resume tweaking. That's why most people don't do it — and why those who do have a massive advantage.

## The Solution: AI + Transparency

Tools like [RolePatch](/) can tailor your resume in seconds. But the key differentiator is **seeing what changed**. A diff view shows you every word the AI modified, so you stay in control and your resume still sounds like you.

[Try RolePatch free — 3 tokens, no credit card →](/dashboard)`,
  },
  {
    slug: 'ats-score-explained',
    title: 'ATS Scores and Metrics Explained: What Job Seekers Should Track',
    seoTitle: 'ATS Score and ATS Metrics Explained | RolePatch',
    description:
      'Learn what an ATS score actually measures, which resume-match and parsing metrics matter, and why there is no universal ATS pass score.',
    date: '2026-03-16',
    readTime: '5 min',
    content: `## What Is an ATS Score?

An ATS score usually means a **resume-to-job match score** produced by a resume checker. It estimates how closely your resume reflects a specific job description. It is not a universal score shared by every Applicant Tracking System, and employers do not all use the same formula.

Treat the score as a comparison tool: use it to find missing evidence, improve the resume, and compare the new version with the original. It cannot predict whether a recruiter will interview you.

## How Resume Match Scores Work

A resume checker extracts signals from the job description and compares them with the resume. Useful signals include:

- **Required-skill coverage** — which named tools, certifications, and capabilities appear with supporting evidence
- **Role and seniority alignment** — whether titles, scope, and responsibility match the opening
- **Experience evidence** — whether relevant terms appear in concrete achievement bullets rather than an isolated keyword list
- **Parsing quality** — whether standard headings and readable formatting let software identify experience, education, and skills
- **Missing requirements** — which important job-description signals have no honest counterpart in the resume

Exact matching is only one input. Adding a keyword you cannot support may raise a simplistic score while making the resume less credible to a recruiter.

## ATS Score vs. ATS Metrics

People use “ATS metrics” to describe several different things. For a job seeker, the useful metrics are:

- **Parse completeness:** did the checker correctly identify your contact details, work history, education, and skills?
- **Required-skill coverage:** how many genuinely relevant requirements are supported by your resume?
- **Preferred-skill coverage:** which optional requirements strengthen your fit?
- **Evidence quality:** are matched skills demonstrated through outcomes, scale, or ownership?
- **Match improvement:** did a reviewed revision close real gaps without inventing experience?

Recruiting teams track different operational ATS metrics, such as application completion, source of hire, time to review, and movement through interview stages. Those employer metrics are not your personal resume score.

## Is There a Good ATS Score?

There is no universal ATS pass score. A 75 in one checker is not equivalent to a 75 in another, and a company may use filters, recruiter review, knockout questions, or no numerical resume score at all.

Use a score directionally. A revised resume should parse cleanly, cover the role's important requirements, and improve against the same job description and the same scoring method. Review every change before applying.

## How to Check Your Score

Use [RolePatch's free keyword checker](/tools/keywords) to compare one resume with one job description. It shows matched and missing terms so you can inspect the evidence behind the result instead of relying on a number alone.

## How to Improve It

1. **Fix parsing first** — use standard headings, readable text, and a straightforward structure
2. **Match truthful terminology** — when your experience supports it, use the language the job description uses
3. **Prioritize required skills** — make the most relevant evidence easy to find in recent roles and achievements
4. **Show proof** — connect skills to outcomes, scale, ownership, or measurable impact
5. **Remove unsupported keywords** — never add a requirement you cannot defend in an interview

[Check your ATS score free →](/tools/keywords)`,
  },
  {
    slug: 'resume-keywords-guide',
    title: 'The Complete Guide to Resume Keywords in 2026',
    description:
      'Which keywords matter, which are filler, and how to find the right ones for any job description.',
    date: '2026-03-16',
    readTime: '6 min',
    content: `## Keywords Are the Bridge

Keywords connect your experience to what the employer is looking for. They're the terms that ATS systems scan for and that recruiters skim for in the first 6 seconds of reading your resume.

## Types of Keywords

### Hard Skills (Highest Weight)
Programming languages, tools, platforms, certifications. These are binary — you either know Python or you don't.

*Examples: React, AWS, Kubernetes, PMP, SQL, Figma, Tableau*

### Soft Skills (Low Weight Alone)
Generic traits like "team player" or "detail-oriented" carry almost no weight unless backed by evidence.

*Better approach:* Instead of "strong communicator," write "Presented quarterly results to C-suite stakeholders across 4 departments."

### Action Verbs (Medium Weight)
Verbs that match the JD's level of responsibility signal fit.

*Junior:* built, implemented, developed, supported
*Senior:* led, architected, designed, mentored, scaled
*Executive:* transformed, established, drove, championed

### Industry Terms (High Weight)
Every industry has jargon. Using it signals insider knowledge.

*Tech:* microservices, CI/CD, agile, sprint, SLA
*Finance:* P&L, due diligence, compliance, risk assessment
*Marketing:* CAC, LTV, conversion rate, attribution

## How to Find the Right Keywords

1. **Read the JD three times** — once for overview, once for required skills, once for nice-to-haves
2. **Look for repeated words** — if "data analysis" appears 4 times, it's critical
3. **Check "requirements" vs. "nice to have"** — requirements are must-match keywords
4. **Use the keyword checker** — [RolePatch's free tool](/tools/keywords) extracts and compares automatically

## Common Mistakes

- **Keyword stuffing** — cramming keywords unnaturally. ATS may pass it but humans will reject it.
- **Using abbreviations only** — write "Search Engine Optimization (SEO)" the first time, then "SEO" after.
- **Ignoring the JD** — your resume should be a response to the job description, not a generic history.

[Analyze your resume keywords free →](/tools/keywords)`,
  },
];

export const blogPostBySlug = (slug: string): BlogPost | undefined =>
  blogPosts.find((p) => p.slug === slug);

export const blogSlugs = (): string[] => blogPosts.map((p) => p.slug);
