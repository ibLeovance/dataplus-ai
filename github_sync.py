#!/usr/bin/env python3
"""Sync all tracked changed files to github via Git Trees API with a single commit."""
import base64, json, os, subprocess, urllib.request

TOKEN = "<REDACTED>"
OWNER, REPO = "ibLeovance", "dataplus-ai"
BASE = "https://api.github.com"

def gh(method, path, payload=None, full=False):
    url = path if full else f"{BASE}/repos/{OWNER}/{REPO}/{path}"
    req = urllib.request.Request(url, method=method,
        data=json.dumps(payload).encode() if payload else None)
    req.add_header("Authorization", f"Bearer {TOKEN}")
    if payload:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        print(f"HTTP {e.code} on {method} {path}: {body[:500]}")
        raise

if __name__ == "__main__":
    changed = subprocess.run("git diff --name-only", shell=True, capture_output=True, text=True).stdout.split()
    all_files = subprocess.run("git ls-files", shell=True, capture_output=True, text=True).stdout.split()
    changed = [f for f in changed if f in all_files]
    print("changed tracked files:", len(changed))
    if not changed:
        raise SystemExit("nothing to sync")
    repo = gh("GET", "https://api.github.com/repos/ibLeovance/dataplus-ai", full=True)
    branch = repo["default_branch"]
    print("default branch:", branch)
    branch_sha = gh("GET", f"branches/{branch}")["commit"]["sha"]
    tree = []
    for f in changed:
        local = os.path.join("/home/ubuntu/dataplus-ai", f)
        new = open(local, "rb").read()
        blob = gh("POST", "git/blobs", {"content": base64.b64encode(new).decode(), "encoding": "base64"})
        tree.append({"path": f, "mode": "100644", "type": "blob", "sha": blob["sha"]})
        print("blob:", f)
    new_tree = gh("POST", "git/trees", {"base_tree": branch_sha, "tree": tree})
    commit = gh("POST", "git/commits", {
        "message": "Round 40: Notifications Hub, recharge Processing wording, live-only endpoint parity (bots/funding/import-ad-tasks), 24h reset + tiered video pools",
        "tree": new_tree["sha"], "parents": [branch_sha]})
    gh("PATCH", f"git/refs/heads/{branch}", {"sha": commit["sha"]})
    print("synced:", len(tree), "files ->", commit["sha"][:7])
