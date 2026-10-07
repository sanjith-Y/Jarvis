from typing import List, Dict, Any
import urllib.parse
import urllib.request
import json

class WebSearchEngine:
    def search(self, query: str, max_results: int = 4) -> Dict[str, Any]:
        query = query.strip()
        if not query:
            return {"query": "", "results": [], "summary": "Empty search query."}

        results = []

        # 1. Try duckduckgo_search library
        try:
            from duckduckgo_search import DDGS
            with DDGS() as ddgs:
                ddg_results = list(ddgs.text(query, max_results=max_results))
                for r in ddg_results:
                    results.append({
                        "title": r.get("title", ""),
                        "url": r.get("href", ""),
                        "snippet": r.get("body", "")
                    })
        except Exception as e:
            print("DDGS library search failed, trying fallback:", e)

        # 2. Fallback to DuckDuckGo Instant Answer API if empty
        if not results:
            try:
                encoded = urllib.parse.quote(query)
                url = f"https://api.duckduckgo.com/?q={encoded}&format=json&no_html=1&skip_disambig=1"
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 Jarvis/1.0"})
                with urllib.request.urlopen(req, timeout=4) as resp:
                    data = json.loads(resp.read().decode())
                    abstract = data.get("AbstractText")
                    if abstract:
                        results.append({
                            "title": data.get("Heading", query),
                            "url": data.get("AbstractURL", "https://duckduckgo.com/?q=" + encoded),
                            "snippet": abstract
                        })
                    for rel in data.get("RelatedTopics", [])[:3]:
                        if isinstance(rel, dict) and rel.get("Text"):
                            results.append({
                                "title": rel.get("Text")[:50] + "...",
                                "url": rel.get("FirstURL", ""),
                                "snippet": rel.get("Text")
                            })
            except Exception as e:
                print("DDG fallback failed:", e)

        if not results:
            return {
                "query": query,
                "results": [],
                "summary": f"No live search results could be retrieved for '{query}'."
            }

        snippets = [f"- {r['title']}: {r['snippet']}" for r in results]
        summary = f"Found {len(results)} sources for '{query}':\n" + "\n".join(snippets)

        return {
            "query": query,
            "results": results,
            "summary": summary
        }

web_search_engine = WebSearchEngine()
