#!/usr/bin/env python3
"""Reject credential-shaped strings and the configured secret in staged source."""
import re, subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
secret_file=root/'web/.env.local'
secret=secret_file.read_text().strip().split('=',1)[1].encode() if secret_file.exists() else None
paths=subprocess.check_output(['git','diff','--cached','--name-only','--diff-filter=ACM','-z'],cwd=root).split(b'\0')
for raw in filter(None,paths):
 name=raw.decode(); data=subprocess.check_output(['git','show',':'+name],cwd=root)
 if (secret and secret in data) or re.search(rb'apikey_[a-f0-9]{20,}_[a-f0-9]{20,}',data):
  raise SystemExit('Credential detected in staged file: '+name)
print('Staged credential scan passed.')
