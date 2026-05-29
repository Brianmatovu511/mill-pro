const router = require('express').Router();
const Anthropic = require('@anthropic-ai/sdk');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const { buildSnapshot } = require('../utils/aiContext');
const logger = require('../utils/logger');

const HAIKU  = 'claude-haiku-4-5-20251001';
const SONNET = 'claude-sonnet-4-6';

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const requireAI = (req, res, next) => {
  if (!client) return res.status(503).json({
    error: 'AI advisor is not configured. Add ANTHROPIC_API_KEY to your environment to enable it.'
  });
  next();
};

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.companyId || req.ip,
  message: { error: 'AI rate limit reached — please wait a minute and try again.' },
});

// ─── System prompts ────────────────────────────────────
function chatSystemPrompt(snapshot) {
  return `You are the **MillPro AI Advisor** — a senior milling-industry consultant for ${snapshot.company.name}, a maize/grain mill in East Africa operating in ${snapshot.company.currency}.

You have full visibility into this company's operational data via the JSON snapshot below. Use it to answer questions with specific, accurate numbers from this company only — never invent data. When the data doesn't contain something the user asks about, say so honestly and suggest what they could start tracking.

# Style
- Be concise and professional. 2–4 short paragraphs unless asked for depth.
- Always lead with the answer, then 1–2 specific data points, then 1 actionable suggestion if relevant.
- Use ${snapshot.company.currency} for all amounts. Round large numbers (e.g., "${snapshot.company.currency} 4.2M" not "${snapshot.company.currency} 4,234,567").
- Use markdown bullet points for lists. Use **bold** for key numbers.
- Never expose the raw JSON or mention "the snapshot".
- If the user asks something outside the data, gently redirect to what you *can* answer.

# Domain expertise (use as benchmarks)
- Healthy maize-to-flour yield: 73–78%. Below 70% suggests poor maize quality or machine inefficiency. Above 80% is excellent.
- Healthy payroll-to-revenue ratio: 12–18%. Above 25% is concerning.
- Bran-to-flour ratio: 22–28% is normal milling output.
- Inventory days for maize: 14–21 days is balanced.
- Customer concentration: any single customer above 30% of revenue is a risk.

# Today's date
${new Date().toISOString().slice(0,10)}

# Company data snapshot
\`\`\`json
${JSON.stringify(snapshot, null, 2)}
\`\`\``;
}

function reportSystemPrompt(snapshot) {
  return `You are the MillPro AI Advisor generating an executive **weekly report** for ${snapshot.company.name}, a maize milling company operating in ${snapshot.company.currency}.

Use only the data in the JSON snapshot below. Be specific with numbers. Never invent data.

# Output format (markdown)

Produce exactly these sections, in this order:

## Executive Summary
2–3 sentences capturing the week's story.

## Highlights
3 bullet points of what went well, each with a specific number.

## Concerns
3 bullet points of what needs attention, each with a specific data point.

## Trends vs Previous Period
What's changing month-over-month — revenue, yield, payroll, key customers. Use percentages.

## Industry Benchmark Comparison
Compare these company metrics to industry norms (use the norms in the snapshot or these standards: yield 73–78%, payroll-to-revenue 12–18%, bran 22–28%). Be specific about where they're above/below and by how much.

## Recommended Actions for Next Week
3 specific, prioritized actions tied to the data above. Each action should be concrete (not "improve efficiency" but "investigate Machine #2 — yield dropped 4 percentage points last week").

# Style
- Format ${snapshot.company.currency} amounts compactly (4.2M not 4,234,567).
- Honest about negative findings — the owner needs accurate truth, not flattery.
- Keep the whole report under 600 words.

# Today's date
${new Date().toISOString().slice(0,10)}

# Company data snapshot
\`\`\`json
${JSON.stringify(snapshot, null, 2)}
\`\`\``;
}

// ─── Endpoints ─────────────────────────────────────────

// Suggested starter questions (returns even without API key)
router.get('/suggestions', authenticate, (_req, res) => {
  res.json({
    suggestions: [
      "What's my profit this week?",
      "Why might my flour yield be down?",
      "Which employees are my top performers this month?",
      "Should I order more maize? What's my inventory looking like?",
      "Show me my top 5 customers and how much they spend",
      "How are sales trending vs last month?",
      "Where am I spending the most money?",
      "Is my payroll-to-revenue ratio healthy?",
      "Generate a SWOT analysis from my data",
      "Which production batches had the best yield?",
    ],
  });
});

// Get the data snapshot (for transparency, debugging, or other uses)
router.get('/snapshot', authenticate, async (req, res) => {
  try {
    const snap = await buildSnapshot(req.companyId);
    res.json(snap);
  } catch (err) {
    logger.error('AI snapshot failed', { error: err.message });
    res.status(500).json({ error: 'Failed to build snapshot' });
  }
});

// Chat — multi-turn conversation
router.post('/chat', authenticate, requireAI, aiLimiter, async (req, res) => {
  try {
    const { messages = [], message } = req.body;
    if (!message || typeof message !== 'string' || !message.trim())
      return res.status(400).json({ error: 'Message is required' });
    if (message.length > 2000) return res.status(400).json({ error: 'Message too long (max 2000 chars)' });
    if (messages.length > 30)  return res.status(400).json({ error: 'Conversation too long — please start a new chat' });

    const snapshot = await buildSnapshot(req.companyId);
    if (!snapshot) return res.status(404).json({ error: 'Company data not found' });

    // Sanitize incoming history — only keep role/content of valid turns
    const history = messages
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));

    const reply = await client.messages.create({
      model: HAIKU,
      max_tokens: 1024,
      system: chatSystemPrompt(snapshot),
      messages: [...history, { role: 'user', content: message.trim() }],
    });
    const text = reply.content?.[0]?.text || '(no reply)';

    res.json({
      reply: text,
      usage: reply.usage ? { input: reply.usage.input_tokens, output: reply.usage.output_tokens } : null,
    });
  } catch (err) {
    logger.error('AI chat failed', { error: err.message, status: err.status });
    if (err.status === 401) return res.status(503).json({ error: 'AI service is not authorized. Please check the API key.' });
    if (err.status === 429) return res.status(429).json({ error: 'AI service is busy. Please try again in a moment.' });
    res.status(500).json({ error: 'AI service unavailable. Please try again.' });
  }
});

// Weekly report — single deeper analysis
router.post('/report/weekly', authenticate, requireAI, aiLimiter, async (req, res) => {
  try {
    const snapshot = await buildSnapshot(req.companyId);
    if (!snapshot) return res.status(404).json({ error: 'Company data not found' });

    const reply = await client.messages.create({
      model: SONNET,
      max_tokens: 2048,
      system: reportSystemPrompt(snapshot),
      messages: [{ role: 'user', content: 'Generate this week\'s executive report following the format above.' }],
    });
    const text = reply.content?.[0]?.text || '(no report generated)';

    res.json({
      report: text,
      generated_at: new Date().toISOString(),
      usage: reply.usage ? { input: reply.usage.input_tokens, output: reply.usage.output_tokens } : null,
    });
  } catch (err) {
    logger.error('AI report failed', { error: err.message, status: err.status });
    res.status(500).json({ error: 'Failed to generate report. Please try again.' });
  }
});

module.exports = router;
