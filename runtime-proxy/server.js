import dotenv from 'dotenv';
dotenv.config();
import billingRouter from '../server/api/billing.mjs';
import billingRouter from '../server/api/billing.mjs';

import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/billing', billingRouter);
app.use('/api/billing', billingRouter);

app.post('/api/runtime/gemini', async (req, res) => {
  console.log('[RUNTIME REQUEST]', JSON.stringify(req.body, null, 2));

  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'Missing GROQ_API_KEY' });
    }

    const userMessage = req.body?.contents?.[0]?.parts?.[0]?.text
      || req.body?.prompt
      || '';

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.GROQ_API_KEY
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || null;

    res.status(response.status).json({
      raw: data,
      response: text || 'SYSTEM_FALLBACK_RESPONSE'
    });

  } catch (error) {
    res.status(500).json({
      error: String(error),
      response: 'SYSTEM_ERROR_FALLBACK'
    });
  }
});

app.listen(3030, () => {
  console.log('ICOS Runtime Proxy → http://localhost:3030');
});
