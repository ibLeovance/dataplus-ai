#!/usr/bin/env python3
"""Redact all secret-like tokens from files flagged by GitHub secret scanning."""
import re, sys

FILES = ["ROUND23-STATE.md", "ROUND25-NOTES.md", "ROUND26-STATE.md", "ROUND40-STATE.md", "ROUND41-NOTES.md", "github_sync.py"]

def redact(text):
    text = re.sub(r"cfut_[A-Za-z0-9_\-]{20,}", "CFUT_TOKEN_PLACEHOLDER", text)
    text = re.sub(r"cfk_[A-Za-z0-9_\-]{20,}", "CFK_TOKEN_PLACEHOLDER", text)
    text = re.sub(r"ghp_[A-Za-z0-9_]{36,}", "GHP_TOKEN_PLACEHOLDER", text)
    text = re.sub(r"github_pat_[A-Za-z0-9_]{36,}", "GHPAT_PLACEHOLDER", text)
    text = re.sub(r"eyJhbGciOiJ[A-Za-z0-9_\-\.]+", "JWT_PLACEHOLDER", text)
    return text

total = 0
for f in FILES:
    try:
        src = open(f).read()
    except FileNotFoundError:
        print("missing:", f); continue
    out = redact(src)
    if out != src:
        open(f, "w").write(out)
        total += 1
        print("redacted:", f)
    else:
        # find any suspicious tokens still present
        leftovers = re.findall(r"(?:cfut_|cfk_|ghp_|github_pat_|eyJhbGci)[A-Za-z0-9_\-\.]{20,}", src)
        print("no change:", f, "leftovers:", leftovers[:5])
print("total redacted files:", total)
