#!/usr/bin/env python3
"""Create ai-computer-xplus-ai-fresh Pages project (if missing) and deploy."""
import json
import os
import subprocess
import urllib.request

WDIR = "/home/ubuntu/dataplus-ai"
PROJECT = "ai-computer-xplus-ai-fresh"
TOKEN = os.environ.get("CFTOKEN", "<CFUT-TOKEN-REDACTED>")
ACCT = "0ec80d86459ac03a994318aeeb18b519"
EMAIL = "Bitcoinxml2000@proton.me"
API = f"https://api.cloudflare.com/client/v4/accounts/{ACCT}"


def cf_api(method, path, payload=None):
    req = urllib.request.Request(f"{API}{path}", method=method, data=json.dumps(payload).encode() if payload else None)
    req.add_header("Authorization", f"Bearer {TOKEN}")
    if payload:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


if __name__ == "__main__":
    # 1. create project if not exists
    try:
        cf_api("GET", f"/pages/projects/{PROJECT}")
        print("project exists")
    except Exception:
        try:
            r = cf_api("POST", "/pages/projects", {"name": PROJECT, "production_branch": "main"})
            print("project created:", r["result"]["subdomain"])
        except Exception as e:
            # 400 usually means project already exists under a different check; skip create and deploy anyway
            print("create skipped (already exists):", e)
    # 2. build
    os.chdir(WDIR)
    r = subprocess.run("pnpm run build:worker", shell=True, capture_output=True, text=True)
    print("build:", r.returncode)
    if r.returncode != 0:
        print(r.stderr[-800:])
        raise SystemExit(1)
    subprocess.run("rm -rf client/dist/__manus__", shell=True, cwd=WDIR)
    sha = subprocess.run("git rev-parse HEAD", shell=True, capture_output=True, text=True).stdout.strip()
    env = os.environ.copy()
    env.update({"CLOUDFLARE_API_TOKEN": TOKEN, "CLOUDFLARE_ACCOUNT_ID": ACCT, "CLOUDFLARE_API_EMAIL": EMAIL})
    r = subprocess.run(
        f"npx -y wrangler@3.114.17 pages deploy ./client/dist --project-name={PROJECT} --branch=main --commit-hash={sha} --commit-message=auto",
        shell=True, cwd=WDIR, capture_output=True, text=True, env=env)
    print("deploy:", r.returncode)
    print(r.stdout[-800:])
    if r.returncode != 0 and r.stderr:
        print(r.stderr[-800:])
