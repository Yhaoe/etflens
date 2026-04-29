import os
import json
import urllib.request
import time

def fetch_gemini():
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set.")
        return None

    prompt = """
    You are a professional quantitative financial analyst.
    Your task is to generate a JSON array containing the top 10 ETFs for exactly 10 categories right now in the US Market.
    Return ONLY raw JSON. No markdown formatting, no backticks.
    The categories are: growth, dividend, conservative, halal, international, sector, topus, esg, bond, custom.
    Structure exactly like this:
    [
      {
        "id": "growth",
        "icon": "🌱", "label": "GROWTH", "sub": "High earnings growth", "color": "#00e87a",
        "sortOptions": ["Total Return (%)", "Sharpe Ratio"], "specificFilter": {"label": "Beta", "options": ["All"]},
        "etfs": [
           { "ticker": "QQQ", "name": "Invesco NASDAQ 100", "er": 0.20, "td": 0.02, "sharpe": 1.12, "r5": 145.2, "aum": 280, "yld": 0.5, "beta": 1.18, "adv": 8500, "inc": 1999 }
        ]
      }
    ]
    Make sure to provide exactly 10 realistic ETFs per category. Be precise with typical Expense Ratios (er) and Beta.
    """

    models_to_try = [
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash",
        "gemini-pro"
    ]

    for model_name in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        data = json.dumps({
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "response_mime_type": "application/json"
            }
        }).encode('utf-8')

        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
        
        try:
            print(f"Trying model: {model_name}...")
            with urllib.request.urlopen(req) as response:
                res_body = response.read().decode('utf-8')
                res_json = json.loads(res_body)
                raw_text = res_json['candidates'][0]['content']['parts'][0]['text']
                clean_text = raw_text.replace("```json", "").replace("```", "").strip()
                return json.loads(clean_text)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8')
            print(f"Model {model_name} failed with HTTP {e.code}: {err_body}")
        except Exception as e:
            print(f"Model {model_name} failed with Error: {e}")

    print("All fallback models failed.")
    return None

if __name__ == "__main__":
    print("Starting Autonomous Market Scanner...")
    data = fetch_gemini()
    if data:
        # Output to root of the repo so github pages/raw can serve it
        out_path = os.path.join(os.path.dirname(__file__), '..', 'categories.json')
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f"Successfully generated {out_path} with {len(data)} categories.")
    else:
        print("Failed to generate categories.")
