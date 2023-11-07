import { readFile } from 'fs/promises';
import { join } from 'path';
import config from '../config.js';
import ImageBuilder from '../scripts/image-builder.js';

export default async function handler(req, res) {
  const time = Date.now();

  const { id, message, messageDate, reply, value } = req.body;
  const replyDate = new Date(time + 9 * 60 * 60 * 1000).toISOString().slice(0, -1) + '+09:00';
  const { imageBase64, width, height } = await (async () => {
    const dir = join(process.cwd(), 'assets');
    const files = config.fontFiles;
    const promises = [];
    for (const file of files) {
      promises.push(readFile(join(dir, file)));
    }
    const builder = new ImageBuilder(await Promise.all(promises));
    const { data, width, height } = builder.generate(message);
    builder.free();
    return {
      imageBase64: Buffer.from(data).toString('base64'),
      width,
      height,
    };
  })();
  const content = JSON.stringify({
    id,
    messageDate,
    message,
    replyDate,
    reply,
    width,
    height,
  }, undefined, 2) + '\n';

  try {
    const GITHUB_OWNER = process.env['VERCEL_GIT_REPO_OWNER'];
    const GITHUB_REPO = process.env['VERCEL_GIT_REPO_SLUG'];
    const GITHUB_BRANCH = process.env['VERCEL_GIT_COMMIT_REF'];
    const GITHUB_TOKEN = process.env['GITHUB_TOKEN'];
    const GITHUB_BASE = 'https://api.github.com';
    const GITHUB_GIT = `${GITHUB_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git`;
    const GITHUB_BLOBS = `${GITHUB_GIT}/blobs`;
    const GITHUB_COMMITS = `${GITHUB_GIT}/commits`;
    const GITHUB_REF = `${GITHUB_GIT}/ref/heads/${GITHUB_BRANCH}`;
    const GITHUB_REFS = `${GITHUB_GIT}/refs/heads/${GITHUB_BRANCH}`;
    const GITHUB_TREES = `${GITHUB_GIT}/trees`;
    const GITHUB_HEADERS = {
      'accept': 'application/vnd.github+json',
      'authorization': `token ${GITHUB_TOKEN}`,
      'user-agent': 'Admin',
      'x-github-api-version': '2022-11-28',
    };
    let github;

    // Get a SHA of the last commit on the current branch
    // https://docs.github.com/en/rest/git/refs?apiVersion=2022-11-28#get-a-reference
    github = await fetch(GITHUB_REF, {
      method: 'GET',
      headers: GITHUB_HEADERS,
    });
    if (!github.ok) {
      throw new Error(`Couldn't get a ref: ${github.status}`);
    }
    const commitSha = (await github.json()).object.sha;

    // Get a SHA of the root tree on the commit retrieved previously
    // https://docs.github.com/en/rest/git/commits?apiVersion=2022-11-28#get-a-commit-object
    github = await fetch(GITHUB_COMMITS + `/${commitSha}`, {
      method: 'GET',
      headers: GITHUB_HEADERS,
    });
    if (!github.ok) {
      throw new Error(`Couldn't get a commit: ${github.status}`);
    }
    const treeSha = (await github.json()).tree.sha;

    // Create a blob of the image
    // https://docs.github.com/en/rest/git/blobs?apiVersion=2022-11-28#create-a-blob
    github = await fetch(GITHUB_BLOBS, {
      method: 'POST',
      headers: GITHUB_HEADERS,
      body: JSON.stringify({
        content: imageBase64,
        encoding: 'base64',
      }),
    });
    if (!github.ok) {
      throw new Error(`Couldn't create a blob of the image: ${github.status}`);
    }
    const imageSha = (await github.json()).sha;

    // Create a tree to edit the content of the repository
    // https://docs.github.com/en/rest/git/trees?apiVersion=2022-11-28#create-a-tree
    const tree = [
      {
        path: `data/${id}.json`,
        mode: '100644',
        type: 'blob',
        content: content,
      },
      {
        path: `public/images/${id}.png`,
        mode: '100644',
        type: 'blob',
        sha: imageSha,
      }
    ];
    github = await fetch(GITHUB_TREES, {
      method: 'POST',
      headers: GITHUB_HEADERS,
      body: JSON.stringify({
        base_tree: treeSha,
        tree: tree,
      }),
    });
    if (!github.ok) {
      throw new Error(`Couldn't create a tree: ${github.status}`);
    }
    const newTreeSha = (await github.json()).sha;

    // Create a commit that uses the tree created above
    // https://docs.github.com/en/rest/git/commits?apiVersion=2022-11-28#create-a-commit
    github = await fetch(GITHUB_COMMITS, {
      method: 'POST',
      headers: GITHUB_HEADERS,
      body: JSON.stringify({
        message: `[답글] ${id}`,
        tree: newTreeSha,
        parents: [commitSha],
      }),
    });
    if (!github.ok) {
      throw new Error(`Couldn't create a commit: ${github.status}`);
    }
    const newCommitSha = (await github.json()).sha;

    // Make the current branch point to the created commit
    // https://docs.github.com/en/rest/git/refs?apiVersion=2022-11-28#update-a-reference
    github = await fetch(GITHUB_REFS, {
      method: 'PATCH',
      headers: GITHUB_HEADERS,
      body: JSON.stringify({
        sha: newCommitSha,
      }),
    });
    if (!github.ok) {
      throw new Error(`Couldn't update the ref: ${github.status}`);
    }

    // Remove the message from the unreplied database
    const KV_URL = process.env.KV_REST_API_URL;
    const KV_HEADERS = {
      'authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
    };
    const db = await fetch(KV_URL, {
      method: 'POST',
      headers: KV_HEADERS,
      body: JSON.stringify(['LREM', 'messages', 1, value]),
    });
    if (!db.ok) {
      throw new Error(`Couldn't remove data: ${db.status}`);
    }
  } catch (e) {
    console.error(e);
    return res.status(500).send(e.toString());
  }

  return res.status(200).json({ replyDate, imageBase64 });
}
