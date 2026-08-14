import subprocess, os
r = subprocess.run(["npx", "wrangler", "pages", "deploy", "dist", "--project-name", "ai-computer-xplus-ai-fresh"], capture_output=True, text=True)
print(r.stdout[-1500:])
print(r.stderr[-800:])
