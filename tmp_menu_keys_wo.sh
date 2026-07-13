#!/bin/bash
cd /mnt/d/itvision-1
python3 - << 'PY'
import json
with open('mobile/consumer/src/i18n/wo.json') as f:
    data = json.load(f)
menu = data.get('menu', {})
for k, v in menu.items():
    print(f"{k}: {v}")
PY
