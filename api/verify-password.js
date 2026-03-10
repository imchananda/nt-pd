export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Parse body — Vercel usually auto-parses, but fallback just in case
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
    }
    if (!body) body = {};

    const { password } = body;
    const correctPassword = process.env.SITE_PASSWORD;

    if (!correctPassword) {
        return res.status(500).json({ error: 'Server misconfigured' });
    }

    if (!password || password !== correctPassword) {
        return res.status(401).json({ error: 'Incorrect password' });
    }

    // Simple token — just a timestamp so the client can store it
    const token = `ntf-${Date.now()}`;
    return res.status(200).json({ token });
}
