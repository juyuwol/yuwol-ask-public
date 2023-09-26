export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { replied, unreplied } = await req.json();
  
  try {
    if (replied && replied.length > 0) {
      await deleteReplied(replied);
    }
    if (unreplied && unreplied.length > 0) {
      await deleteUnreplied(unreplied);
    }
  } catch (e) {
    console.error(e);
    return new Response(e.toString(), { status: 500 });
  }

  return new Response(null, { status: 204 });
}

async function deleteReplied(ids) {
  const GITHUB_OWNER = process.env['VERCEL_GIT_REPO_OWNER'];
  const GITHUB_REPO = process.env['VERCEL_GIT_REPO_SLUG'];
  const GITHUB_BRANCH = process.env['VERCEL_GIT_COMMIT_REF'];
  const GITHUB_TOKEN = process.env['GITHUB_TOKEN'];
  const GITHUB_BASE = 'https://api.github.com';
  const GITHUB_GIT = `${GITHUB_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git`;
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

  // Create a tree to edit the content of the repository
  // https://docs.github.com/en/rest/git/trees?apiVersion=2022-11-28#create-a-tree
  const tree = [];
  for (const id of ids) {
    tree.push({
      path: `data/${id}.json`,
      mode: '100644',
      type: 'blob',
      sha: null,
    });
    tree.push({
      path: `public/images/${id}.png`,
      mode: '100644',
      type: 'blob',
      sha: null,
    });
  }
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
      message: `[삭제] ${ids.join(', ')}`,
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
}

async function deleteUnreplied(values) {
  const commands = [];
  for (const value of values) {
    commands.push(['LREM', 'messages', 1, value]);
  }
  const KV_URL = process.env.KV_REST_API_URL;
  const KV_HEADERS = {
    'authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
  };
  const db = await fetch(KV_URL + '/pipeline', {
    method: 'POST',
    headers: KV_HEADERS,
    body: JSON.stringify(commands),
  });
  if (!db.ok) {
    throw new Error(`Couldn't remove data: ${db.status}`);
  }
}
