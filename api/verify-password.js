export default function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { password } = req.body;
    const correctPassword = process.env.SITE_PASSWORD;

    if (!correctPassword) {
        return res.status(500).json({ error: 'Server misconfigured' });
    }

    if (!password || password !== correctPassword) {
        // Small delay to slow down brute-force attempts
        setTimeout(() => {
            res.status(401).json({ error: 'Incorrect password' });
        }, 800);
        return;
    }

    // Generate a simple session token (timestamp-based, validated by server if needed)
    // For this use case, we trust the client to store it and present it
    const token = Buffer.from(
        `auth:${Date.now()}:${process.env.SITE_PASSWORD_SALT || 'ntf-prada'}`
    ).toString('base64');

    res.status(200).json({ token });
}
