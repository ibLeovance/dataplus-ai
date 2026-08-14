import subprocess, os
env = os.environ.copy()
env.update({"CLOUDFLARE_API_TOKEN": "<CFTOKEN-REDACTED>", "CLOUDFLARE_ACCOUNT_ID": "0ec80d86459ac03a994318aeeb18b519", "CLOUDFLARE_API_EMAIL": "Bitcoinxml2000@proton.me"})
r = subprocess.run("npx -y wrangler@3.114.17 pages deploy ./client/dist --project-name=ai-computer-xplus-ai-fresh --branch=main --commit-message=hardened-ip-security", shell=True, capture_output=True, text=True, env=env)
print("deploy:", r.returncode)
print(r.stdout[-1200:])
print(r.stderr[-500:])
