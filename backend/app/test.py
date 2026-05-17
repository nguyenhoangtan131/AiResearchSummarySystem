import requests
import json

url = "https://google.serper.dev/search"

payload = json.dumps({
  "q": "site:cafef.vn OR site:vneconomy.vn (ticker OR 'mã cổ phiếu' OR 'lợi nhuận') 'vàng SJC'",
  "gl": "vn",
  "hl": "vi",
  "num": 1
})
headers = {
  'X-API-KEY': 'cd334808b03542b610c339e3ca3109f2e2a276d6',
  'Content-Type': 'application/json'
}

response = requests.request("POST", url, headers=headers, data=payload)

print(response.text)