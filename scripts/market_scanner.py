import os
import json
import urllib.request
import time

def fetch_gemini():
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set.")
        return None

    # Dynamically fetch available models to avoid 404 errors
    list_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    target_model = None
    try:
        req_list = urllib.request.Request(list_url)
        with urllib.request.urlopen(req_list) as response:
            res_body = response.read().decode('utf-8')
            models_data = json.loads(res_body)
            
            available_models = []
            for m in models_data.get('models', []):
                if 'generateContent' in m.get('supportedGenerationMethods', []):
                    name = m['name'].split('/')[-1]
                    available_models.append(name)
            
            if not available_models:
                print("Error: No models found that support generateContent.")
                return None
                
            # Try to pick a flash model first
            for name in available_models:
                if 'flash' in name.lower():
                    target_model = name
                    break
            
            if not target_model:
                target_model = available_models[0]
                
            print(f"Dynamically selected model: {target_model} from {len(available_models)} available models.")
    except Exception as e:
        print(f"Failed to list models: {e}")
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

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{target_model}:generateContent?key={api_key}"
    data = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "response_mime_type": "application/json"
        }
    }).encode('utf-8')

    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
    
    max_retries = 12
    for attempt in range(1, max_retries + 1):
        try:
            print(f"Requesting generateContent from {target_model} (Attempt {attempt}/{max_retries})...")
            with urllib.request.urlopen(req) as response:
                res_body = response.read().decode('utf-8')
                res_json = json.loads(res_body)
                raw_text = res_json['candidates'][0]['content']['parts'][0]['text']
                clean_text = raw_text.replace("```json", "").replace("```", "").strip()
                return json.loads(clean_text)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8')
            print(f"Model {target_model} failed with HTTP {e.code}: {err_body}")
            if e.code in [503, 429] and attempt < max_retries:
                print(f"Server busy or rate limited. Waiting 5 minutes before retry...")
                time.sleep(300)
                continue
            return None
        except Exception as e:
            print(f"Model {target_model} failed with Error: {e}")
            if attempt < max_retries:
                print(f"Unexpected error. Waiting 5 minutes before retry...")
                time.sleep(300)
                continue
            return None
            
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
