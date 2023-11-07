import { readdirSync, writeFile } from 'fs';
import { readFile, mkdir } from 'fs/promises';
import { basename, join } from 'path';
import { fileURLToPath } from 'url';
import { Eta } from 'eta';
import config from '../config.js';

const isDev = (process.env.NODE_ENV === 'development');
const isProxy = (process.env.NODE_ENV === 'proxy');

const projectDir = fileURLToPath(new URL('../', import.meta.url));
const dataDir = join(projectDir, 'data');
const templateDir = join(projectDir, 'templates');
const destDir =
  isDev ?
  join('Z:', basename(projectDir)) :
  isProxy ?
  join('D:/Documents/yuwol-static/ask') :
  join(projectDir, 'public')
;
const adminDir = 'mailbox';
const imageDir = 'images';
const listDir = 'lists';
const postDir = 'posts';
const searchDir = 'search';
const submitDir = 'submit';

// Initialize a template engine
const eta = new Eta({ views: templateDir, cache: true });

if (!isProxy) {
  // Make directories
  const DIR_OPTS = { recursive: true };
  await Promise.all([
    mkdir(join(destDir, listDir), DIR_OPTS),
    mkdir(join(destDir, postDir), DIR_OPTS),
    mkdir(join(destDir, searchDir), DIR_OPTS),
    mkdir(join(destDir, adminDir), DIR_OPTS),
    mkdir(join(destDir, submitDir), DIR_OPTS),
  ]);

  // Write pages
  writePage('400.html', 'status', {
    title: '400 Bad Request',
    message: '잘못된 요청입니다.'
  });
  writePage('404.html', 'status', {
    title: '404 Not Found',
    message: '이곳에는 아무것도 없습니다.'
  });
  writePage('405.html', 'status', {
    title: '405 Method Not Allowed',
    message: '허용되지 않은 메소드입니다.'
  });
  writePage('500.html', 'status', {
    title: '500 Internal Server Error',
    message: '서버 장애로 요청을 처리하지 못했습니다.'
  });
  writePage('index.html', 'home', { path: '/' });
  writePage(join(searchDir, 'index.html'), 'search', { path: `/${searchDir}/` });
  writePage(join(adminDir, 'index.html'), 'admin', {
    VERCEL_TOKEN: process.env.VERCEL_TOKEN,
    PROJECT_ID: process.env.PROJECT_ID,
  });
  writePage(join(submitDir, 'success.html'), 'status', {
    title: '제출 완료',
    message: '메시지가 제출되었습니다.'
  });
}

// Write post and list pages
const { perPage } = config;
const datas = await Promise.all((() => {
  const files = readdirSync(dataDir);
  const promises = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const path = join(dataDir, file);
    promises.push(readFile(path, 'utf8').then(data => JSON.parse(data)));
  }
  return promises;
})());
const total = datas.length;
const lastPage = (total > perPage) ? Math.ceil(total / perPage) : 1;
const listFirstPath = `/${listDir}/1.html`;
const listLastPath = `/${listDir}/${lastPage}.html`;
const search = [];
const replied = [];
const proxied = [];

datas.sort((a, b) => (a.id > b.id) ? -1 : 1);
for (let i = total - 1, prevDate = '', count = 1; i >= 0; i--) {
  const date = datas[i].messageDate.slice(0, 10);
  count = (prevDate === date) ? (count + 1) : 1;
  datas[i].count = count;
  prevDate = date;
}

let items = [];
let page = 1;
let listPath = listFirstPath;
datas.sort((a, b) => (a.replyDate > b.replyDate) ? -1 : 1);
for (const data of datas) {
  const { id, message, reply, count, proxy } = data;
  let { messageDate, replyDate } = data;
  if (messageDate.length === 29) {
    messageDate = messageDate.slice(0, -10) + messageDate.slice(-6);
  }
  if (replyDate.length === 29) {
    replyDate = replyDate.slice(0, -10) + replyDate.slice(-6);
  }
  const title = titleFilter(messageDate, count);
  const messageDateText = dateFilter(messageDate);
  const replyDateText = dateFilter(replyDate);

  data.title = title;
  data.messageDate = messageDate;
  data.replyDate = replyDate;
  data.messageDateText = messageDateText;
  data.replyDateText = replyDateText;
  data.path = `/${postDir}/${id}.html`;
  data.image = `/${imageDir}/${id}.png`;

  items.push(data);
  search.push({
    id,
    title,
    messageDate: messageDateText,
    message,
    replyDate: replyDateText,
    reply,
  });
  if (!isProxy && !proxy) {
    replied.push({
      id,
      title,
      messageDate,
      message,
      replyDate,
      reply,
    });
  }
  if (isProxy && proxy) {
    proxied.push(id);
  }

  if ((!isProxy && !proxy) || (isProxy && proxy)) {
    writePage(join(postDir, `${id}.html`), 'post', data);
  }
  if (!isProxy && items.length === perPage) {
    writeList();
  }
}
if (!isProxy && (total === 0 || items.length > 0)) {
  writeList();
}

// Write assets
if (!isProxy) {
  writeFile(join(destDir, adminDir, 'replied.json'), JSON.stringify(replied), err);
  writeFile(join(destDir, searchDir, 'data.json'), JSON.stringify(search), err);
}

// Write vercel configuration
const RULE_MAX = 4096 - 1; // https://vercel.com/docs/edge-network/redirects
if (isProxy) {
  proxied.reverse();

  const { proxy } = config;
  const { vercel } = await import('../vercel.js');
  const total = proxied.length;
  const idLength = proxied[0].length;

  const postDest = proxy + '/posts/:id';
  const postSrcPre = '/posts/:id(';
  const postSrcPost = ').html';

  const imageDest = proxy + '/images/:id.png';
  const imageSrcPre = '/images/:id(';
  const imageSrcPost = ').png';

  addRules(vercel, postDest,  postSrcPre,  postSrcPost,  total, idLength);
  addRules(vercel, imageDest, imageSrcPre, imageSrcPost, total, idLength);

  writeFile(join(projectDir, 'vercel.json'), JSON.stringify(vercel, undefined, 2) + '\n', err);
}

function writeList() {
  const pager = { pageNum: page };
  if (page > 1) {
    pager.prev = `/${listDir}/${page - 1}.html`;
    pager.first = listFirstPath;
  }
  if (page < lastPage) {
    pager.next = `/${listDir}/${page + 1}.html`;
    pager.last = listLastPath;
  }
  writePage(join(listDir, `${page}.html`), 'list', {
    path: listPath,
    total,
    pager,
    items,
  });
  items = [];
  page++;
  listPath = `/${listDir}/${page}.html`;
}

function writePage(path, template, data) {
  const content = eta.render(template, Object.assign({}, config, data));
  writeFile(join(destDir, path), content, err);
}

function addRules(vercel, dest, srcPre, srcPost, total, idLength) {
  const perRule = Math.floor((RULE_MAX - srcPre.length - srcPost.length - idLength) / (idLength + 1)) + 1;
  let start = 0;
  let end = perRule;
  do {
    vercel.rewrites.push({
      source: srcPre + proxied.slice(start, end).join('|') + srcPost,
      destination: dest,
    });
    start = end;
    end += perRule;
  } while (start < total)
}

function titleFilter(date, count) {
  let mm = date.slice(5, 7);
  let dd = date.slice(8, 10);
  if (mm[0] === '0') mm = mm[1];
  if (dd[0] === '0') dd = dd[1];
  return `${date.slice(2, 4)}년 ${mm}월 ${dd}일 ${count}번째 메시지`;
}

function dateFilter(date) {
  let mm = date.slice(5, 7);
  let dd = date.slice(8, 10);
  if (mm[0] === '0') mm = mm[1];
  if (dd[0] === '0') dd = dd[1];
  let ss = `${date.slice(0, 4)}년 ${mm}월 ${dd}일`;
  if (date.length > 10) ss += ` ${date.slice(11, 19)}`;
  return ss;
}

function err(e) {
  if (e) console.error(e);
}
