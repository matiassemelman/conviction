#!/usr/bin/env python3
"""Run a bounded, non-secret advisory judgment; retain request/response evidence."""
import json, sys, time, urllib.request
from pathlib import Path
root = Path(__file__).resolve().parents[1]
stage = sys.argv[1]
request_path = Path(sys.argv[2])
request = json.loads(request_path.read_text())
secret = (root / 'web/.env.local').read_text().strip().split('=', 1)[1]
request.setdefault('model', 'jev-latest')
assert secret not in json.dumps(request), 'Secret must never enter model state'
started = time.monotonic()
req = urllib.request.Request('https://api.typesafe.ai/v1/systemone', data=json.dumps(request).encode(), headers={'Authorization': 'Bearer ' + secret, 'Content-Type': 'application/json'})
with urllib.request.urlopen(req, timeout=60) as response:
    result = json.load(response)
receipt = {'stage': stage, 'request': request, 'response': result, 'elapsed_ms': round((time.monotonic()-started)*1000), 'note': 'Advisory judgment, not proof of correctness.'}
path = root / 'docs/jev' / (stage + '.json')
path.parent.mkdir(exist_ok=True)
path.write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps({'stage':stage, 'model':result['model'], 'answers':result['answers'], 'usage':result.get('usage'), 'elapsed_ms':receipt['elapsed_ms']}))
