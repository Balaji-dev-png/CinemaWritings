import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VibeWritingOGFetcher/1.0)',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${response.statusText}` }, { status: response.status });
    }

    const html = await response.text();

    // Simple regex-based OG parsing
    const extractOgMeta = (property: string) => {
      const regex = new RegExp(`<meta(?:[^>]*)property=(?:"|')og:${property}(?:"|')(?:[^>]*)content=(?:"|')([^"']+)(?:"|')[^>]*>`, 'i');
      const match = html.match(regex);
      if (match) return match[1];

      // Try alternate attribute order: content="..." property="og:..."
      const altRegex = new RegExp(`<meta(?:[^>]*)content=(?:"|')([^"']+)(?:"|')(?:[^>]*)property=(?:"|')og:${property}(?:"|')[^>]*>`, 'i');
      const altMatch = html.match(altRegex);
      return altMatch ? altMatch[1] : null;
    };

    // Extract basic title if OG title is missing
    const extractTitle = () => {
      const match = html.match(/<title>([^<]*)<\/title>/i);
      return match ? match[1].trim() : null;
    };

    // Extract basic description if OG description is missing
    const extractDescription = () => {
      const regex = /<meta(?:[^>]*)name=(?:"|')description(?:"|')(?:[^>]*)content=(?:"|')([^"']+)(?:"|')[^>]*>/i;
      const match = html.match(regex);
      return match ? match[1] : null;
    };

    const title = extractOgMeta('title') || extractTitle() || new URL(targetUrl).hostname;
    const description = extractOgMeta('description') || extractDescription() || '';
    const image = extractOgMeta('image') || '';
    
    // Default favicon fallback
    const favicon = `https://www.google.com/s2/favicons?domain=${new URL(targetUrl).hostname}&sz=32`;

    return NextResponse.json({
      title,
      description,
      image,
      favicon,
      url: targetUrl,
    });
  } catch (error: any) {
    console.error('OG Fetch Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
