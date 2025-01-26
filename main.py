from flask import Flask, render_template, request, jsonify
import requests

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/check_ads_txt', methods=['POST'])
def check_ads_txt():
    data = request.json
    entries = data.get('entries', [])
    domains = data.get('domains', [])

    results = []
    for domain in domains:
        try:
            response = requests.get(f"https://{domain}/ads.txt", timeout=5)
            response.raise_for_status()
            ads_txt_content = response.text.split('\n')
            missing_entries = [entry for entry in entries if entry not in ads_txt_content]
            results.append({
                "domain": domain,
                "missing_entries": missing_entries if missing_entries else ["None"]
            })
        except requests.RequestException as e:
            results.append({
                "domain": domain,
                "missing_entries": [f"Error fetching ads.txt: {str(e)}"]
            })
    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True)
