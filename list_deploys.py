import os, re, urllib.request, json

src = open("deploy_new.py").read()
tok = os.environ.get("CFTOKEN") or re.search(r'CFTOKEN["\']?\s*[=:]\s*"([^"]+)"', src)
if hasattr(tok, "group"):
    tok = tok.group(1)
acct = re.search(r'ACCT\s*=\s*"([^"]+)"', src).group(1)
proj = re.search(r'PROJECT\s*=\s*"([^"]+)"', src).group(1)

req = urllib.request.Request(
    f"https://api.cloudflare.com/client/v4/accounts/{acct}/pages/projects/{proj}/deployments",
    headers={"Authorization": f"Bearer {tok}"},
)
d = json.load(urllib.request.urlopen(req, timeout=30))
for dep in d["result"][:5]:
    aliases = dep.get("aliases") or []
    flag = "MAIN-ALIAS" if any("ai-computer-xplus-ai-fresh.pages.dev" == a for a in aliases) else ""
    print(f"{dep['id'][:10]}  status={dep['latest_stage']['status']}  prod={dep['production_branch']}  {flag}  {aliases[:2]}")
