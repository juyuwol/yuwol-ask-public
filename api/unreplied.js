export const config = { runtime: 'edge' };

export default async function handler() {
  try {
    const KV_URL = process.env.KV_REST_API_URL;
    const KV_HEADERS = {
      'authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
    };
    const db = await fetch(KV_URL, {
      method: 'POST',
      headers: KV_HEADERS,
      body: JSON.stringify(['LRANGE', 'messages', 0, -1]),
    });
    if (!db.ok) {
      throw new Error(`Couldn't get data: ${db.status}`);
    }
    const list = (await db.json()).result;
    const data = [];
    for (const json of list) {
      data.push(JSON.parse(json))
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(e.toString(), { status: 500 });
  }
}
