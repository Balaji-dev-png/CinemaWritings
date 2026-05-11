import requests
import json

url = "http://127.0.0.1:8000/api/scripts/1/export/pdf/"
payload = {
    "title_page_html": "<h1>Test Title</h1>",
    "script_body_html": "<p>Test Body</p>"
}
try:
    response = requests.post(url, json=payload)
    print("Status:", response.status_code)
    print("Headers:", response.headers)
except Exception as e:
    print("Error:", e)
