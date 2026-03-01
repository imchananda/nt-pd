export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    // Only allow Dropbox and Google Drive domains for security
    const allowedDomains = [
        'dl.dropboxusercontent.com',
        'www.dropbox.com',
        'drive.google.com',
        'lh3.googleusercontent.com',
    ];

    let decodedUrl;
    try {
        decodedUrl = decodeURIComponent(url);
    } catch {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    const isAllowed = allowedDomains.some(domain => decodedUrl.includes(domain));
    if (!isAllowed) {
        return res.status(403).json({ error: 'Domain not allowed' });
    }

    try {
        const response = await fetch(decodedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/*,*/*;q=0.8',
            },
            redirect: 'follow',
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to fetch image' });
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        if (!contentType.startsWith('image/') && !contentType.startsWith('application/octet-stream')) {
            return res.status(422).json({ error: 'URL does not point to an image' });
        }

        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(200).send(Buffer.from(buffer));
    } catch (err) {
        console.error('Image proxy error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
