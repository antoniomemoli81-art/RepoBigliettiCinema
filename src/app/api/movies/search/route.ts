import { NextRequest, NextResponse } from "next/server";

export interface MovieSearchResult {
  title: string;
  year?: string;
  poster?: string | null;
  source: "omdb" | "itunes";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results: MovieSearchResult[] = [];
  const seenTitles = new Set<string>();

  // 1. Try OMDb API
  const omdbKey = process.env.OMDB_API_KEY;
  if (omdbKey) {
    try {
      const omdbUrl = `https://www.omdbapi.com/?s=${encodeURIComponent(
        query
      )}&type=movie&apikey=${omdbKey}`;

      const res = await fetch(omdbUrl, { next: { revalidate: 3600 } });
      const data = await res.json();

      if (data.Response === "True" && Array.isArray(data.Search)) {
        for (const item of data.Search) {
          const key = `${item.Title.toLowerCase()}-${item.Year}`;
          if (!seenTitles.has(key)) {
            seenTitles.add(key);
            results.push({
              title: item.Title,
              year: item.Year,
              poster: item.Poster && item.Poster !== "N/A" ? item.Poster : null,
              source: "omdb",
            });
          }
        }
      }
    } catch (err) {
      console.warn("OMDb search error:", err);
    }
  }

  // 2. Also search iTunes (localized in Italian) to catch Italian cinema releases & high-res artwork
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
      query
    )}&entity=movie&country=it&limit=5`;

    const res = await fetch(itunesUrl, { next: { revalidate: 3600 } });
    const data = await res.json();

    if (Array.isArray(data.results)) {
      for (const item of data.results) {
        const title = item.trackName || item.collectionName;
        if (!title) continue;
        const year = item.releaseDate ? item.releaseDate.slice(0, 4) : "";
        const key = `${title.toLowerCase()}-${year}`;

        if (!seenTitles.has(key)) {
          seenTitles.add(key);
          const poster = item.artworkUrl100
            ? item.artworkUrl100.replace("100x100bb", "600x600bb")
            : null;

          results.push({
            title,
            year,
            poster,
            source: "itunes",
          });
        }
      }
    }
  } catch (err) {
    console.warn("iTunes fallback search error:", err);
  }

  return NextResponse.json({ results: results.slice(0, 8) });
}
