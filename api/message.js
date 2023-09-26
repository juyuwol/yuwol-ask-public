import { readFileSync } from 'fs';
import { join } from 'path';
import config from '../config.js';

export default async function handler(req, res) {
  const time = Date.now();

  const reqMethod = req.method;
  if (reqMethod === 'HEAD' || reqMethod === 'GET') {
    const body = readFileSync(join(process.cwd(), 'public', '405.html'), 'utf8');
    res.setHeader('content-type', 'text/html; charset=utf-8');
    return res.status(405).send(body);
  }
  if (reqMethod !== 'POST') {
    return res.status(405).send();
  }

  const message = (() => {
    try {
      return req.body.message;
    } catch (e) {
      return null;
    }
  })();
  if (
    !message ||
    typeof message !== 'string' ||
    message.trim() === '' ||
    message.length > config.messageMaxLength
  ) {
    const body = readFileSync(join(process.cwd(), 'public', '400.html'), 'utf8');
    res.setHeader('content-type', 'text/html; charset=utf-8');
    return res.status(400).send(body);
  }

  const messageDate = new Date(time + 9 * 60 * 60 * 1000).toISOString().slice(0, -1) + '+09:00';
  const timestamp = time.toString(36);

  try {
    const KV_URL = process.env.KV_REST_API_URL;
    const KV_HEADERS = {
      'authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
    };
    let db;
    db = await fetch(KV_URL, {
      method: 'POST',
      headers: KV_HEADERS,
      body: JSON.stringify(['LINDEX', 'messages', 0]),
    });
    if (!db.ok) {
      throw new Error(`Couldn't get the prev data: ${db.status}`);
    }
    const result = (await db.json()).result;
    let counter = 0;
    if (result) {
      const prev = JSON.parse(result);
      const prevId = prev.id;
      const prevTimestamp = prevId.slice(0, 8);
      if (timestamp === prevTimestamp) {
        const prevCounter = parseInt(prevId.slice(8), 36);
        counter = prevCounter + 1;
      }
    }
    const id = timestamp + counter.toString(36);
    db = await fetch(KV_URL, {
      method: 'POST',
      headers: KV_HEADERS,
      body: JSON.stringify(['LPUSH', 'messages', JSON.stringify({
        id,
        messageDate,
        message,
      })]),
    });
    if (!db.ok) {
      throw new Error(`Couldn't store the data: ${db.status}`);
    }
  } catch (e) {
    console.error(e);
    const body = readFileSync(join(process.cwd(), 'public', '500.html'), 'utf8');
    res.setHeader('content-type', 'text/html; charset=utf-8');
    return res.status(500).send(body);
  }

  try {
    const email = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${process.env.RESEND_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: `${config.siteTitle} <${config.email.from}>`,
        to: config.email.to,
        subject: '익명 메시지 도착',
        html: [
          `<p style="white-space: pre-wrap;">${message}</p>`,
          `<p>- ${messageDate.replace('T', ' ').slice(0, -10)}</p>`,
          `<p><a href="${config.origin}/mailbox/">답글 쓰기</a></p>`,
        ].join(''),
      }),
    });
    if (!email.ok) {
      throw new Error(`Couldn't send an emial: ${email.status}`);
    }
  } catch (e) {
    console.error(e);
  }

  res.setHeader('location', '/submit/success.html');
  return res.status(303).send();
}
