export const config = { runtime: 'edge' };

export default async function handler(req) {
  const time = Date.now();

  const { id, reply } = await req.json();
  if (!id || !reply) {
    return new Response(null, { status: 400 });
  }
  const replyDate = new Date(time + 9 * 60 * 60 * 1000).toISOString().slice(0, -1) + '+09:00';

  try {
    const GITHUB_OWNER = process.env['VERCEL_GIT_REPO_OWNER'];
    const GITHUB_REPO = process.env['VERCEL_GIT_REPO_SLUG'];
    const GITHUB_TOKEN = process.env['GITHUB_TOKEN'];
    const GITHUB_BASE = 'https://api.github.com';
    const GITHUB_CONTENTS = `${GITHUB_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents`;
    const GITHUB_HEADERS = {
      'accept': 'application/vnd.github+json',
      'authorization': `token ${GITHUB_TOKEN}`,
      'user-agent': 'Admin',
      'x-github-api-version': '2022-11-28',
    };
    const url = GITHUB_CONTENTS + `/data/${id}.json`;
    let github;

    // https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28
    github = await fetch(url, {
      method: 'GET',
      headers: GITHUB_HEADERS,
    });
    if (!github.ok) {
      throw new Error(`Couldn't get a file: ${github.status}`);
    }

    const { sha, content } = await github.json();
    const data = JSON.parse(Buffer.from(content, 'base64').toString());
    data.reply = reply;
    data.replyDate = replyDate;
    const newContent = JSON.stringify(data, undefined, 2) + '\n';

    // https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28
    github = await fetch(url, {
      method: 'PUT',
      headers: GITHUB_HEADERS,
      body: JSON.stringify({
        message: `[수정] ${id}`,
        content: Buffer.from(newContent).toString('base64'),
        sha: sha,
      }),
    });
    if (!github.ok) {
      throw new Error(`Couldn't update the file: ${github.status}`);
    }
  } catch (e) {
    console.error(e);
    return new Response(e.toString(), { status: 500, });
  }

  return new Response(JSON.stringify({ replyDate }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
