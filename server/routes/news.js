const router = require('express').Router();
const Anthropic = require('@anthropic-ai/sdk');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const MODEL = 'claude-sonnet-4-6';
const TTL_MS = 60 * 60 * 1000; // 1 hour cache

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// Server-wide cache — maize news is generic, shared across all companies.
let cache = { at: 0, data: null };
let inflight = null;

// Don't let a flood of refreshes hammer the API.
const newsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 6,
  keyGenerator: (req) => req.user?.companyId || req.ip,
  message: { error: 'Please wait a moment before refreshing the news again.' },
});

const PROMPT = `Search the web for the most recent and important MAIZE and GRAIN MILLING industry news, focusing on:
1. Uganda specifically (maize prices, harvests, exports, government policy, milling sector)
2. East Africa / Africa (regional maize trade, food security, weather affecting crops)
3. World (global grain markets, maize futures, major producers like USA/Brazil, prices)

Find 8-10 genuinely recent news items (prefer the last 30 days). For each, give a clear title, a 2-3 sentence plain-English summary useful to a mill operator, the region, the source name, the article URL, and the approximate date.

Respond with ONLY valid JSON, no markdown, in exactly this shape:
{"items":[{"title":"...","summary":"...","region":"Uganda|Africa|World","source":"...","url":"https://...","date":"e.g. May 2026"}]}`;

function extractJson(text) {
  if (!text) return null;
  // Strip code fences if present
  let t = text.replace(/```json/gi, '```').replace(/```/g, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(t.slice(start, end + 1)); } catch { return null; }
}

async function gatherNews() {
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
    messages: [{ role: 'user', content: PROMPT }],
  });
  // Concatenate all text blocks from the final answer
  const text = (resp.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
  const parsed = extractJson(text);
  const items = (parsed && Array.isArray(parsed.items)) ? parsed.items : [];
  // Sanitize / clamp
  const clean = items.slice(0, 12).map(i => ({
    title: String(i.title || '').slice(0, 200),
    summary: String(i.summary || '').slice(0, 600),
    region: ['Uganda', 'Africa', 'World'].includes(i.region) ? i.region : 'World',
    source: String(i.source || '').slice(0, 80),
    url: typeof i.url === 'string' && /^https?:\/\//.test(i.url) ? i.url : null,
    date: String(i.date || '').slice(0, 40),
  })).filter(i => i.title);
  return { updatedAt: new Date().toISOString(), items: clean };
}

router.get('/', authenticate, newsLimiter, async (req, res) => {
  if (!client) return res.status(503).json({ error: 'News service is not configured.' });
  const fresh = req.query.refresh === '1';
  const age = Date.now() - cache.at;

  if (!fresh && cache.data && age < TTL_MS) return res.json(cache.data);

  try {
    // De-duplicate concurrent fetches
    if (!inflight) {
      inflight = gatherNews().finally(() => { inflight = null; });
    }
    const data = await inflight;
    if (data.items.length) cache = { at: Date.now(), data };
    // If fresh fetch returned nothing but we have a stale cache, serve stale
    if (!data.items.length && cache.data) return res.json(cache.data);
    res.json(data);
  } catch (err) {
    logger.error('News fetch failed', { error: err.message, status: err.status });
    if (cache.data) return res.json(cache.data); // serve stale on error
    res.status(502).json({ error: 'Could not fetch news right now. Please try again shortly.' });
  }
});

module.exports = router;
