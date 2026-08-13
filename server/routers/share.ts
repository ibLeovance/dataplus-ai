import { Router } from 'express';

export const router = Router();

router.get('/links', (req, res) => {
  const domain = process.env.APP_DOMAIN || 'dataplus-ai.koyeb.app';
  const base = `https://${domain}`;
  
  res.json({
    links: {
      whatsapp: 'https://whatsapp.com/channel/0029VbDeCZR0G0XcheBZiT2i',
      platform: base,
      name: 'AI COMPUTER PLUS',
    }
  });
});
