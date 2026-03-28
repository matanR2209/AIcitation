/**
 * runner.js — API-based runner for all 4 AIs
 *
 * Reads API keys from .env (dotenv).
 * Runs all 4 AIs in parallel for the given prompt.
 * Communicates with server.js via stdout:
 *   [MSG] <json>  → parsed and broadcast to FE via WebSocket
 *   anything else → logged to BE console
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true });

if (process.stdout._handle) process.stdout._handle.setBlocking(true);

const PROMPT_IDX  = parseInt(process.env.PROMPT_IDX ?? '0', 10);
const PROMPT_TEXT = process.env.PROMPT_TEXT ?? '';

function msg(obj)    { process.stdout.write('[MSG] ' + JSON.stringify(obj) + '\n'); }
function status(txt) { msg({ type: 'status', message: txt }); }
function log(txt)    { process.stdout.write('[runner] ' + txt + '\n'); }

const SOURCE_SUFFIX = `

At the end of your response, include a "Sources" section listing the publications, websites, or databases where this information can be verified. Use a numbered list with just the source name — do not fabricate URLs.

Format exactly like this:
Sources:
1. ESPN
2. Basketball Reference
3. NBA.com`;

// ─── Platform callers ───────────────────────────────────────────────────────

async function callClaude(prompt) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set in BE/.env');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data.error ?? data));
  return data.content[0].text;
}

async function callChatGPT(prompt) {
  const key = process.env.GITHUB_TOKEN;
  if (!key) throw new Error('GITHUB_TOKEN not set in BE/.env');

  const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? JSON.stringify(data));
  return data.choices[0].message.content;
}

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set in BE/.env');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? JSON.stringify(data));
  return data.candidates[0].content.parts[0].text;
}

async function callTavily(prompt) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error('TAVILY_API_KEY not set in BE/.env');

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      query: prompt,
      search_depth: 'basic',
      max_results: 5,
      include_answer: true,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? JSON.stringify(data));

  // Format: AI answer + real source URLs
  const sources = (data.results ?? [])
    .map(r => `- ${r.title}: ${r.url}`)
    .join('\n');
  return `${data.answer ?? ''}\n\nSources:\n${sources}`;
}

async function callPerplexity(prompt) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new Error('PERPLEXITY_API_KEY not set in BE/.env');

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? JSON.stringify(data));
  return data.choices[0].message.content;
}

// ─── Main ───────────────────────────────────────────────────────────────────

const ALL_PLATFORMS = [
  { id: 'claude',  name: 'Claude',  call: callClaude,  useSuffix: true  },
  { id: 'chatgpt', name: 'ChatGPT', call: callChatGPT, useSuffix: true  },
  { id: 'gemini',  name: 'Gemini',  call: callGemini,  useSuffix: true  },
  { id: 'tavily',  name: 'Tavily',  call: callTavily,  useSuffix: false }, // real web search — no suffix needed
  // { id: 'perplexity', name: 'Perplexity', call: callPerplexity, useSuffix: false },
];

// Filter to only the requested engines (or all if none specified)
const ENGINES_FILTER = process.env.ENGINES ? process.env.ENGINES.split(',').map(e => e.trim()) : null;
const PLATFORMS = ENGINES_FILTER
  ? ALL_PLATFORMS.filter(p => ENGINES_FILTER.includes(p.id))
  : ALL_PLATFORMS;

log(`ENGINES env: "${process.env.ENGINES ?? 'not set'}" → running: [${PLATFORMS.map(p => p.id).join(', ')}]`);

async function run() {
  if (!PROMPT_TEXT) {
    log('No PROMPT_TEXT provided — exiting');
    process.exit(1);
  }

  const engineNames = PLATFORMS.map(p => p.name).join(', ');
  log(`Prompt ${PROMPT_IDX}: "${PROMPT_TEXT.slice(0, 80)}…"`);
  status(`Running prompt ${PROMPT_IDX + 1} with ${engineNames}…`);

  const results = await Promise.allSettled(
    PLATFORMS.map(async ({ id, name, call, useSuffix }) => {
      status(`${name}: sending request…`);
      try {
        const text = await call(useSuffix ? PROMPT_TEXT + SOURCE_SUFFIX : PROMPT_TEXT);
        log(`${name}: got ${text.length} chars`);
        msg({ type: 'response', promptIdx: PROMPT_IDX, ai: id, text });
        status(`${name}: ✓ done`);
      } catch (err) {
        log(`${name}: ERROR — ${err.message}`);
        msg({ type: 'response', promptIdx: PROMPT_IDX, ai: id, text: `[Error: ${err.message}]` });
        status(`${name}: ✗ failed`);
      }
    })
  );

  const errors = results.filter(r => r.status === 'rejected');
  if (errors.length) {
    errors.forEach(e => log('Unhandled rejection: ' + e.reason));
  }

  log('All done');
}

run().catch(err => {
  process.stdout.write('[MSG] ' + JSON.stringify({ type: 'error', message: err.message }) + '\n');
  process.stderr.write('[runner ERROR] ' + err.stack + '\n');
  process.exit(1);
});
