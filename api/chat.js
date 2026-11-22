// File: api/chat.js (Vercel Serverless Function / Node 18+)
// Set GEMINI_API_KEY in your host's Environment Variables.

const SYSTEM_INSTRUCTION = `You are VISIONARY CHAT, a CBSE Class 10 Physics tutor.
Stick to the rationalized NCERT/CBSE Class 10 Physics syllabus:
1. Light – Reflection and Refraction
2. The Human Eye and the Colourful World
3. Electricity
4. Magnetic Effects of Electric Current
Exclude deleted topics (Electric Motor, Generator, Electromagnetic Induction).
Format responses cleanly with <p>, <h4>, <ul>, <li>, <strong>, and <span class="formula-chip">...</span>.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Server GEMINI_API_KEY not configured' });
  }

  const { message, history = [], topic = null } = req.body || {};
  if (!message || typeof message !== 'string' || message.length > 1500) {
    return res.status(400).json({ error: 'Invalid or overly long message' });
  }

  const contents = [
    ...history.slice(-8).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: String(m.text || '').slice(0, 2000) }],
    })),
    {
      role: 'user',
      parts: [{ text: topic ? `[Topic: ${topic}] ${message}` : message }],
    },
  ];

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents,
        generationConfig: { temperature: 0.35, maxOutputTokens: 900 },
      }),
    });

    if (!upstream.ok) {
      return res.status(502).json({ error: 'Upstream AI request failed' });
    }

    const data = await upstream.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: 'Proxy error' });
  }
}
