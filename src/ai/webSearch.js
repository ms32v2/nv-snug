import fetch from "node-fetch";

export async function serpSearch(query) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) throw new Error("SERPAPI_KEY not set");
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(
    query
  )}&api_key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`SerpAPI error ${res.status}`);
  const data = await res.json();

  // Return the first snippet (feel free to improve)
  const snippet = data?.organic_results?.[0]?.snippet || "No result";
  return snippet;
}

