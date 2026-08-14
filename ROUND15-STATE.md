# Round 15 — Brand Assets (14 Aug 2026)

## User request (Hausa)
Create images + logo for AI COMPUTER PLUS website, plus a channel description saying:
"AI Computer is free task and VIP plan funding... ana investment kuma kamar online job task kudi... funding since kaza kaza". User wants a STORY and DESCRIPTION written to post.

## Project facts
- Live site: https://ai-computer-xplus-ai-fresh.pages.dev (Cloudflare Pages)
- Source repo: /home/ubuntu/dataplus-ai (client/ + server/, build: pnpm build:worker && npx vite build; deploy: python3 deploy_fix.py from repo root)
- Brand colors: deep red gradient (luxury-hero), white bg, Playfair Display + Poppins fonts
- Current login logo: red rounded square with white "AI" text (css only). Login page: client/src/pages/Login.tsx. About page exists (/about).
- WhatsApp channel: https://whatsapp.com/channel/0029VbDeCZR0G0XcheBZiT2i
- Brand facts: founded/since 2026, "Modern Investment Platform", free 30s video tasks, VIP plans ($5-$1000), min withdraw, funding since concept inception.
- Deploy script requires `pnpm build:worker` BEFORE deploy_fix.py (uploads client/dist + _worker.js).

## Assets to generate (this phase)
- Logo: /home/ubuntu/webdev-static-assets/aicp-logo.png (1:1) — luxury red/gold AI computer logo, text "AI COMPUTER PLUS"
- Hero banner: /home/ubuntu/webdev-static-assets/aicp-hero.jpg (16:9 or 21:9) — luxury tech, people earning online, AI theme
- (Optional) About page image

## Copy to write
- About Us story (rich: investment platform, free tasks, VIP funding, online job tasks, since 2026)
- WhatsApp channel short bio + long description (copy-paste ready, each separately)

## Round 15 todo items (in /home/ubuntu/dataplus-ai/todo.md)
- [ ] Logo image
- [ ] Hero banner image
- [ ] About Us story
- [ ] WhatsApp channel description
- [ ] Integrate into live site + deploy
- [ ] Deliver in Hausa

## Progress (21:58 UTC)
- Images generated + reserved URLs OK:
  - Logo: /manus-storage/aicp-logo_9260c9d7.png
  - Hero: /manus-storage/aicp-hero_d887aa59.jpg
- Login.tsx: CSS "AI" block → logo img (w-24 h-24). Done.
- About.tsx: header logo img (w-10 h-10), hero section now has background img + red overlay (from rgba(200,16,46,0.82) → rgba(30,15,20,0.85)), story section rewritten (free task engine + VIP Plan Funding Bronze $5→Diamond $500, 365 days, self-funded model). 'Since 2020' → 'Founded 2026' done in About footer + Login footer.
- Copy file written: /home/ubuntu/AI_COMPUTER_PLUS_BRAND_COPY.md (WhatsApp bio + long desc EN/HA, About story, taglines).
- Built: pnpm build:worker + npx vite build — dist/assets/index-CbmG2l5e.js contains storage URLs.
- Deployed via python3 deploy_fix.py — "Deployment complete! https://9f2801e1.ai-computer-xplus-ai-fresh.pages.dev"
- VERIFY: curl of /login HTML shows old asset index-CbmG2l5e.js present (new build ref). Live verification of images pending: check https://ai-computer-xplus-ai-fresh.pages.dev/manus-storage/aicp-logo_9260c9d7.png and the login/about pages in browser.
- Remaining: verify live, push updated Login.tsx+About.tsx to GitHub (gh_push_round14.py pattern, token [GITHUB_PAT], repo ibLeovance/dataplus-ai), mark todo items done, deliver in Hausa with the copy file attached.

## Verification status (22:01 UTC)
- Local files: client/public/aicp-logo.png (1920x1920, quality excellent, red/gold AI chip logo) and aicp-hero.jpg (2688x1152)
- Live: both URLs return 200 with correct content-types
- Login page: logo img src="/aicp-logo.png" works (browser confirmed naturalWidth 1920)
- About page: header logo + hero img both load (naturalWidth confirmed via console). Hero area in screenshots looks pale because the 2688x1152 JPG is mostly light sky/city + red overlay; screenshot tool freezes animations. Text is white/visible. Page markdown confirms new story text renders.
- Login.tsx: logo integrated, footer "Since 2020" removed
- Copy file: /home/ubuntu/AI_COMPUTER_PLUS_BRAND_COPY.md (WhatsApp short bio + long description EN/HA, About story, taglines)
- Remaining: push Login.tsx + About.tsx + public images to GitHub (ibLeovance/dataplus-ai, branch main, token [GITHUB_PAT]), mark todo done, deliver in Hausa.
