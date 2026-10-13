import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { transform } from 'lightningcss';
import { parseHTML } from 'linkedom';

// Home alone uses the Workbench bundle. Keep static-page styles (including layout
// below the fold, so an early scroll never exposes unstyled content), while the
// library's other blocks, themes and dynamic states load asynchronously.
export async function runAstroInlineCss() {
  const file = new URL('../dist/index.html', import.meta.url);
  const source = await readFile(file, 'utf8');
  const styles = /<style[^>]*>([\s\S]*?)<\/style>/g;
  // Use the same font policy in both CSS stages: a late font download must not
  // rewrap text when the deferred stylesheet becomes active.
  const css = transform({
    filename: 'home.css',
    minify: true,
    code: Buffer.from(
      [...source.matchAll(styles)]
        .map((match) => match[1])
        .join('\n')
    ),
  }).code.toString();
  // Restrict first paint to the header and complete hero at every breakpoint.
  let html = source.replace(styles, '');
  const boundary = html.search(/<section\b[^>]*\bid="proof"/);
  if (boundary < 0) throw new Error('Expected the Workbench proof section');
  const initial = html.slice(0, boundary);
  // Match the browser's decoded class tokens, not serialized HTML. In particular,
  // max-sm:[&>*]:w-full is emitted as max-sm:[&amp;&gt;*]:w-full. Missing that
  // rule paints the CTAs in one row, then adds 60px when deferred CSS stacks them.
  const classNames = (markup) => new Set(
    [...parseHTML(markup).document.querySelectorAll('[class]')].flatMap((element) =>
      [...element.classList]
    )
  );
  const allClasses = classNames(html);
  const classes = classNames(initial);
  const types = new Set([...initial.matchAll(/<([\w-]+)/g)].map((match) => match[1]));

  function matches(selector, aboveFold = true) {
    return selector.every((part) => {
      if (part.type === 'class') return (aboveFold ? classes : allClasses).has(part.name);
      if (part.type === 'type') return !aboveFold || types.has(part.name);
      if (part.type === 'id') return (aboveFold ? initial : html).includes(`id="${part.name}"`);
      if (part.type === 'attribute' && part.name.startsWith('data-')) {
        // This static page has no theme-switch bootstrap; keep its shipped mode.
        return part.operation?.operator === 'equal'
          ? html.includes(`${part.name}="${part.operation.value}"`)
          : html.includes(part.name);
      }
      if (part.type === 'pseudo-class' && ['where', 'is'].includes(part.kind)) {
        return part.selectors.some((nested) => matches(nested, aboveFold));
      }
      return true;
    });
  }

  // Keep below-fold geometry, then reveal its decoration when the full CSS is ready.
  const layoutProperty =
    /^(display|position|inset|top|right|bottom|left|float|clear|box-sizing|width|height|min-|max-|margin|padding|gap|row-gap|column-gap|grid|flex|align|justify|order|font|line-height|letter-spacing|text-(align|wrap|transform|indent|overflow)|white-space|word|overflow|border(?!.*(?:color|radius))|aspect-ratio|columns|column-width|column-count|list-style|vertical-align|writing-mode)/;
  function isVariable(declaration) {
    // Lightning CSS also represents unsupported standard properties (text-wrap,
    // font-optical-sizing, font-synthesis, etc.) as `custom` declarations.
    return declaration.property === 'custom' && declaration.value.name.startsWith('--');
  }

  function keepLayout(declaration) {
    const property =
      declaration.property === 'unparsed'
        ? declaration.value.propertyId.property
        : declaration.property === 'custom'
          ? declaration.value.name
          : declaration.property;
    return isVariable(declaration) || layoutProperty.test(property);
  }

  const faces = new Set();
  const faceKey = (rule) => JSON.stringify(rule.value.properties, (key, value) =>
    key === 'loc' ? undefined : value
  );
  const ruleContexts = [];
  let layoutOnly = false;
  const selected = transform({
    filename: 'home.css',
    code: Buffer.from(css),
    minify: true,
    visitor: {
      Rule(rule) {
        if (
          rule.type === 'style' &&
          !rule.value.selectors.some((selector) => matches(selector, false))
        )
          return [];
        if (rule.type === 'font-face') {
          const face = faceKey(rule);
          if (!face.includes('Geist') || faces.has(face)) return [];
          faces.add(face);
        }
        ruleContexts.push(layoutOnly);
        layoutOnly =
          rule.type === 'style' && !rule.value.selectors.some((selector) => matches(selector));
      },
      RuleExit() {
        layoutOnly = ruleContexts.pop();
      },
      Declaration(declaration) {
        if (layoutOnly && !keepLayout(declaration)) return [];
      },
    },
  }).code.toString();

  // Follow variable dependencies rather than inlining every library token.
  const variables = new Map();
  const referenced = new Set();
  transform({
    filename: 'home.css',
    code: Buffer.from(selected),
    visitor: {
      Declaration(declaration) {
        const value = JSON.stringify(declaration.value);
        const names = [...value.matchAll(/--[\w-]+/g)].map((match) => match[0]);
        if (isVariable(declaration)) {
          variables.set(declaration.value.name, [
            ...(variables.get(declaration.value.name) ?? []),
            ...names.filter((name) => name !== declaration.value.name),
          ]);
        } else {
          for (const name of names) referenced.add(name);
        }
      },
    },
  });
  for (const match of html.matchAll(/var\((--[\w-]+)/g)) referenced.add(match[1]);
  for (const name of referenced) {
    for (const dependency of variables.get(name) ?? []) referenced.add(dependency);
  }
  const minimal = transform({
    filename: 'home.css',
    code: Buffer.from(selected),
    minify: true,
    visitor: {
      Declaration(declaration) {
        if (isVariable(declaration) && !referenced.has(declaration.value.name)) return [];
      },
      Rule(rule) {
        if (rule.type === 'property' && !referenced.has(rule.value.name)) return [];
      },
    },
  }).code.toString();
  const critical = transform({
    filename: 'home.css',
    code: Buffer.from(minimal),
    minify: true,
    visitor: {
      Rule(rule) {
        if (rule.type === 'style' && !rule.value.selectors.some((selector) => matches(selector)))
          return [];
      },
    },
  }).code.toString();

  // Independently guard the mobile stacking rule: the declaration-parity audit
  // below uses matches() in both stages and cannot detect its own false negatives.
  let hasMobileCtaRule = false;
  transform({
    filename: 'home.css',
    code: Buffer.from(critical),
    visitor: {
      Rule(rule) {
        if (rule.type === 'style' && rule.value.selectors.some((selector) =>
          selector.some((part) => part.type === 'class' && part.name === 'max-sm:[&>*]:w-full')
        )) hasMobileCtaRule = true;
      },
    },
  });
  if (!hasMobileCtaRule) throw new Error('Critical CSS is missing the mobile CTA stacking rule');

  // Register initial fonts only once. Repeating @font-face in a late stylesheet
  // creates new FontFace objects with fresh display timelines and can rewrap
  // the painted hero. Keep swap and the metric fallback in the initial sheet.
  const deferred = transform({
    filename: 'home.css',
    code: Buffer.from(css),
    minify: true,
    visitor: {
      Rule(rule) {
        if (rule.type === 'font-face' && faces.has(faceKey(rule))) return [];
      },
    },
  }).code.toString();

  // Audit the generated page, not just a fixed list of typography properties.
  // Expand grouped selectors and retain conditional contexts so every initial
  // rule has the same declarations and values in both CSS stages.
  function initialDeclarations(code) {
    const found = new Map();
    const contexts = [];
    transform({
      filename: 'home.css',
      code: Buffer.from(code),
      visitor: {
        Rule(rule) {
          const { rules, loc, ...condition } = rule.value;
          if (rule.type !== 'style') {
            contexts.push(JSON.stringify({ type: rule.type, ...condition }));
            return;
          }
          for (const selector of rule.value.selectors.filter((value) => matches(value))) {
            for (const key of ['declarations', 'importantDeclarations']) {
              for (const declaration of rule.value.declarations[key]) {
                if (isVariable(declaration) && !referenced.has(declaration.value.name)) continue;
                const property =
                  declaration.property === 'custom'
                    ? declaration.value.name
                    : declaration.property === 'unparsed'
                      ? declaration.value.propertyId.property
                      : declaration.property;
                found.set(
                  JSON.stringify([contexts, selector, key, property]),
                  JSON.stringify(declaration, (name, value) => (name === 'loc' ? undefined : value))
                );
              }
            }
          }
        },
        RuleExit(rule) {
          if (rule.type !== 'style') contexts.pop();
        },
      },
    });
    return found;
  }
  const initialFull = initialDeclarations(css);
  const initialCritical = initialDeclarations(critical);
  for (const [key, value] of initialFull) {
    if (initialCritical.get(key) !== value) {
      throw new Error(
        `Critical CSS differs from full CSS for initial declaration ${key}: ${value}`
      );
    }
  }
  // Declaration parity alone misses font registration changes. Keep every
  // initial face (including the metric fallback) exactly once in critical CSS
  // and ensure activating the deferred sheet cannot replace it.
  const initialFaces = new Set();
  transform({
    filename: 'home.css',
    code: Buffer.from(critical),
    visitor: {
      Rule(rule) {
        if (rule.type !== 'font-face') return;
        const face = faceKey(rule);
        if (initialFaces.has(face)) throw new Error('Duplicate critical font face');
        initialFaces.add(face);
      },
    },
  });
  for (const face of faces) {
    if (!initialFaces.has(face)) throw new Error(`Critical CSS is missing font face ${face}`);
  }
  transform({
    filename: 'home.css',
    code: Buffer.from(deferred),
    visitor: {
      Rule(rule) {
        if (rule.type === 'font-face' && initialFaces.has(faceKey(rule))) {
          throw new Error('Deferred CSS re-registers an initial font face');
        }
      },
    },
  });
  const layout = transform({
    filename: 'home.css',
    code: Buffer.from(minimal),
    minify: true,
    visitor: {
      Rule(rule) {
        if (['property', 'font-face', 'keyframes'].includes(rule.type)) return [];
        if (rule.type === 'style' && rule.value.selectors.some((selector) => matches(selector)))
          return [];
      },
    },
  }).code.toString();
  const hash = createHash('sha256').update(deferred).digest('hex').slice(0, 12);
  const href = `/_astro/home-rest.${hash}.css`;
  await writeFile(new URL(`../dist${href}`, import.meta.url), deferred);
  const footerScripts = [];
  // Shared Base has no deferral controls. Retain its exact footer handler and
  // script attributes, but keep these downloads out of the hero's request window.
  html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/g, (tag, attributes, body) => {
    const external = /\bsrc="[^"]+"/.test(attributes);
    const footer = body.includes('const api = "https://api.sassmaker.com"');
    if (!external && !footer) return tag;
    if (footer) {
      const footerHash = createHash('sha256').update(body).digest('hex').slice(0, 12);
      const footerHref = `/_astro/home-footer.${footerHash}.js`;
      footerScripts.push([footerHref, body]);
      attributes += ` src="${footerHref}"`;
    }
    const type = attributes.match(/\btype="([^"]+)"/);
    attributes = attributes.replace(/\s*type="[^"]+"/, '');
    return `<script type="text/plain" data-after-load${type ? ` data-script-type="${type[1]}"` : ''}${attributes}></script>`;
  });
  if (footerScripts.length !== 1) throw new Error('Expected exactly one shared footer handler');
  for (const [path, body] of footerScripts)
    await writeFile(new URL(`../dist${path}`, import.meta.url), body);
  const cloak =
    'html:not([data-home-css-ready]) main>section:not(:first-child),html:not([data-home-css-ready]) footer{visibility:hidden}';
  const links = `<link data-home-rest-css data-href="${href}" onload="document.documentElement.setAttribute('data-home-css-ready','')"><noscript><link rel="stylesheet" href="${href}"><style>${cloak.replaceAll('hidden', 'visible')}</style></noscript>`;
  // Use identical responsive attributes on preload and img. The viewport picks
  // one candidate for both; no mobile/full-size duplicate download.
  const hero = html.match(/<img\b[^>]*\bsrc="\/images\/patch-stage\.webp"[^>]*>/)?.[0];
  if (!hero) throw new Error('Expected the responsive Workbench hero');
  const attribute = (name) => hero.match(new RegExp(`\\b${name}="([^"]+)"`, 'i'))?.[1];
  if (!attribute('srcset') || !attribute('sizes')) {
    throw new Error('Workbench hero is missing responsive attributes');
  }
  const preload = `<link rel="preload" as="image" href="${attribute('src')}" imagesrcset="${attribute('srcset')}" imagesizes="${attribute('sizes')}" fetchpriority="high">`;
  const result = html
    .replace(/(?=<section[^>]*id="proof")/, `<style>${layout}</style>`)
    .replace('<link rel="preload"', `${preload}<link rel="preload"`)
    .replace('</head>', `<style>${critical}${cloak}</style>${links}</head>`);
  if (Buffer.byteLength(result.split('</head>')[0]) >= 40_000) {
    throw new Error(
      `Home head exceeds the 40 KB critical-CSS budget: ${Buffer.byteLength(result.split('</head>')[0])} bytes (${critical.length} CSS)`
    );
  }
  await writeFile(file, result);
  console.log(
    `[inline-critical-css] Astro home: ${Buffer.byteLength(source)} → ${Buffer.byteLength(result)} bytes; head ${Buffer.byteLength(result.split('</head>')[0])} bytes`
  );
}
