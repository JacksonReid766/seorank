export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { biz, city, ind } = req.body || {};
  if (!biz || !city || !ind) return res.status(400).json({ error: 'Missing required fields' });

  const safeBiz = String(biz).slice(0, 100);
  const safeCity = String(city).slice(0, 100);
  const safeInd = String(ind).slice(0, 100);

  const prompt = `You are an AI search visibility analyst. Give a realistic assessment of how visible this business is across AI search platforms.\n\nBusiness: ${safeBiz}\nCity: ${safeCity}\nIndustry: ${safeInd}\n\nConsider local market competitiveness, whether this sounds like an established business or small independent, and what typical AI search signals look like for this business type.\n\nReply ONLY with raw JSON, no markdown, no code fences, no extra text:\n{"overall_score":72,"grade":"Fair","summary":"Two sentence plain-English summary of their situation.","platforms":[{"name":"ChatGPT","score":68,"finding":"One to two sentence finding."},{"name":"Perplexity","score":74,"finding":"One to two sentence finding."},{"name":"Google AI Overviews","score":80,"finding":"One to two sentence finding."},{"name":"Bing Copilot","score":61,"finding":"One to two sentence finding."}],"top_issues":["Issue one","Issue two","Issue three"],"quick_wins":["Win one","Win two"]}`;

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 900,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!upstream.ok) throw new Error('Upstream error ' + upstream.status);

    const data = await upstream.json();
    const raw = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Invalid response format');

    return res.status(200).json(JSON.parse(match[0]));
  } catch {
    return res.status(500).json({ error: 'Failed to fetch ranking data. Please try again.' });
  }
}
