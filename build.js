import { readdirSync, writeFile } from 'fs';
import { readFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Eta } from 'eta';
import config from './config.js';

const DIR_OPTS = { recursive: true };
const TXT_OPTS = { encoding: 'utf8' };

const root = fileURLToPath(dirname(import.meta.url));
const dataDir = join(root, 'data');
const templateDir = join(root, 'templates');
const destDir = join(root, 'public');
const adminDir = 'mailbox';
const imageDir = 'images';
const listDir = 'lists';
const postDir = 'posts';
const searchDir = 'search';
const submitDir = 'submit';
const { perPage } = config;

// Initialize a template engine
const eta = new Eta({ views: templateDir, cache: true });

// Make directories
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
writePage(join(adminDir, 'index.html'), 'admin');
writePage(join(submitDir, 'success.html'), 'status', {
  title: '제출 완료',
  message: '메시지가 제출되었습니다.'
});

// Write post and list pages
const datas = await Promise.all((() => {
  const files = readdirSync(dataDir);
  const promises = [];
  for (const file of files) {
    const path = join(dataDir, file);
    promises.push(readFile(path, TXT_OPTS).then(data => JSON.parse(data)));
  }
  return promises;
})());
const total = datas.length;
const lastPage = (total > perPage) ? Math.ceil(total / perPage) : 1;
const listFirstPath = `/${listDir}/1.html`;
const listLastPath = `/${listDir}/${lastPage}.html`;
const replied = [];
let items = [];
let page = 1;
let listPath = listFirstPath;
datas.sort((a, b) => {
  return (a.replyDate > b.replyDate || (a.replyDate === b.replyDate && a.id > b.id)) ? -1 : 1;
});
for (const data of datas) {
  const { id, messageDate, message, replyDate, reply } = data;
  data.title = titleFilter(messageDate);
  data.messageDateText = dateFilter(messageDate);
  data.replyDateText = dateFilter(replyDate);
  data.path = `/${postDir}/${id}.html`;
  data.image = `/${imageDir}/${id}.png`;
  writePage(join(postDir, `${id}.html`), 'post', data);
  items.push(data);
  replied.push({ id, messageDate, message, replyDate, reply });
  if (items.length === perPage) writeList();
}
if (total === 0 || items.length > 0) writeList();

// Write assets
writeFile(join(destDir, searchDir, 'data.json'), JSON.stringify(replied), err);

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

function titleFilter(date) {
  let mm = date.slice(5, 7);
  let dd = date.slice(8, 10);
  if (mm[0] === '0') mm = mm[1];
  if (dd[0] === '0') dd = dd[1];
  return `${date.slice(2, 4)}년 ${mm}월 ${dd}일 메시지`;
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
