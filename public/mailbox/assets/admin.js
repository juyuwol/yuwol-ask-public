(function () {

const INDEX_URL = {
  'replied': '/mailbox/replied.json',
  'unreplied': '/mailbox/unreplied.json',
};

const index = {};
const deleteIds = {
  'replied': new Set(),
  'unreplied': new Set(),
};

const tabs = document.getElementsByClassName('tab');
const pagers = document.getElementsByClassName('admin-pager');
const pagerCurrs = document.getElementsByClassName('admin-pager-curr');
const pagerFirsts = document.getElementsByClassName('admin-pager-first');
const pagerPrevs = document.getElementsByClassName('admin-pager-prev');
const pagerNexts = document.getElementsByClassName('admin-pager-next');
const pagerLasts = document.getElementsByClassName('admin-pager-last');
const count = document.getElementById('count');
const deleteForm = document.getElementById('delete');
const loading = document.createElement('p');
const replyItemTemplate = document.getElementById('template-reply-item').content.firstElementChild;
const replySuccessTemplate = document.getElementById('template-reply-success').content.firstElementChild;
const modifyItemTemplate = document.getElementById('template-modify-item').content.firstElementChild;
const deleteItemTemplate = document.getElementById('template-delete-item').content.firstElementChild;

let content = document.getElementById('content');
let tab, page, lastPage;

const perPage = parseInt(content.dataset.perPage);
const vercelToken = content.dataset.vercelToken;
const projectId = content.dataset.projectId;

loading.textContent = '로딩중...';
for (const button of tabs) {
  button.onclick = function () {
    changeTab(button.dataset.tab);
  };
}
for (const button of pagerFirsts) {
  button.onclick = goFirst;
}
for (const button of pagerPrevs) {
  button.onclick = goPrev;
}
for (const button of pagerNexts) {
  button.onclick = goNext;
}
for (const button of pagerLasts) {
  button.onclick = goLast;
}

async function changeTab(name) {
  tab = name;
  if (!index[tab]) {
    togglePagers(false);
    count.hidden = true;
    deleteForm.hidden = true;
    content.parentNode.replaceChild(loading, content);
    content = loading;
    const res = await fetch(INDEX_URL[tab]);
    if (!res.ok) {
      content.textContent = `로딩 오류: ${res.status}`;
      return;
    }
    index[tab] = await res.json();
  }
  let total = index[tab].length;
  lastPage = (total > perPage) ? Math.ceil(total / perPage) : 1;
  togglePagers(true);
  updateCount(total);
  count.hidden = false;
  deleteForm.hidden = false;
  deleteForm.onsubmit = updateDeleteList;
  goFirst();
}

function goFirst() {
  updateList(1);
}

function goPrev() {
  let prevPage = page - 1;
  if (prevPage <= 0) prevPage = 1;
  updateList(prevPage);
}

function goNext() {
  let nextPage = page + 1;
  if (nextPage > lastPage) nextPage = lastPage;
  updateList(nextPage);
}

function goLast() {
  updateList(lastPage);
}

function togglePagers(state) {
  for (const pager of pagers) {
    pager.hidden = !state;
  }
}

function updateCount(num) {
  count.textContent = `총 ${num}개의 아이템`;
}

function updateList(num) {
  page = num;
  for (const e of pagerCurrs) {
    e.textContent = `${page} / ${lastPage}`;
  }
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const data = index[tab].slice(start, end);
  let list;
  switch (tab) {
  case 'unreplied':
    list = createReplyList(data);
    break;
  case 'replied':
    list = createModifyList(data);
    break;
  }
  if (!list) return;
  content.parentNode.replaceChild(list, content);
  content = list;
  const loc = pagers[0].getBoundingClientRect().top;
  if (loc < 0) window.scrollBy(0, loc - 12);
}

function updateDeleteList(event) {
  event.preventDefault();
  if (deleteIds[tab].size === 0) return;
  const data = [];
  for (event of index[tab]) {
    if (deleteIds[tab].has(event.id)) data.push(event);
  }
  togglePagers(false);
  updateCount(data.length);
  const list = createDeleteList(data);
  content.parentNode.replaceChild(list, content);
  content = list;
  deleteForm.onsubmit = submitDelete;
}

function createReplyList(data) {
  const list = content.cloneNode();
  for (const e of data) {
    const form = replyItemTemplate.cloneNode(true);
    const elements = form.elements;
    const idField = elements.namedItem('id');
    const messageDateField = elements.namedItem('message-date');
    const messageField = elements.namedItem('message');
    const valueField = elements.namedItem('value');
    const checkbox = form.querySelector('.checkbox');
    const messageDateElm = form.querySelector('.message-date');
    const messageElm = form.querySelector('.message');
    const { id, messageDate, message } = e;
    form.id = id;
    idField.value = id;
    messageDateField.value = messageDate;
    messageField.value = message;
    valueField.value = JSON.stringify(e);
    if (deleteIds[tab].has(id)) checkbox.checked = true;
    checkbox.onchange = function () {
      if (checkbox.checked) {
        deleteIds[tab].add(id);
      } else {
        deleteIds[tab].delete(id);
      }
    };
    messageDateElm.textContent = messageDate;
    messageElm.textContent = message;
    form.onsubmit = submitReply;
    list.appendChild(form);
  }
  return list;
}

function createModifyList(data) {
  const list = content.cloneNode();
  for (const e of data) {
    const form = modifyItemTemplate.cloneNode(true);
    const elements = form.elements;
    const idField = elements.namedItem('id');
    const replyField = elements.namedItem('reply');
    const checkbox = form.querySelector('.checkbox');
    const linkElm = form.querySelector('.link');
    const titleElm = form.querySelector('.title');
    const messageDateElm = form.querySelector('.message-date');
    const messageElm = form.querySelector('.message');
    const replyDateElm = form.querySelector('.reply-date');
    const replyElm = form.querySelector('.reply');
    const { id, title, messageDate, message, replyDate, reply } = e;
    form.id = id;
    idField.value = id;
    replyField.value = reply;
    if (deleteIds[tab].has(id)) checkbox.checked = true;
    checkbox.onchange = function () {
      if (checkbox.checked) {
        deleteIds[tab].add(id);
      } else {
        deleteIds[tab].delete(id);
      }
    };
    linkElm.href = `/posts/${id}.html`;
    titleElm.textContent = title;
    messageDateElm.textContent = messageDate;
    messageElm.textContent = message;
    replyDateElm.textContent = replyDate;
    replyElm.textContent = reply;
    form.onsubmit = submitModify;
    list.appendChild(form);
  }
  return list;
}

function createDeleteList(data) {
  const list = content.cloneNode();
  for (const e of data) {
    const item = deleteItemTemplate.cloneNode(true);
    const checkbox = item.querySelector('.checkbox');
    const messageDateElm = item.querySelector('.message-date');
    const messageElm = item.querySelector('.message');
    const replyDateElm = item.querySelector('.reply-date');
    const replyElm = item.querySelector('.reply');
    const { id, messageDate, message, replyDate, reply } = e;
    checkbox.checked = true;
    checkbox.onchange = function () {
      if (checkbox.checked) return;
      deleteIds[tab].delete(id);
      item.parentNode.removeChild(item);
      if (deleteIds[tab].size === 0) changeTab(tab);
    };
    messageDateElm.textContent = messageDate;
    messageElm.textContent = message;
    if (replyDate) {
      replyDateElm.textContent = replyDate;
    } else {
      item.removeChild(replyDateElm);
    }
    if (reply) {
      replyElm.textContent = reply;
    } else {
      item.removeChild(replyElm);
    }
    list.appendChild(item);
  }
  return list;
}

async function submitReply(event) {
  event.preventDefault();
  if (!window.confirm('제출합니까?')) return;
  const now = Date.now();
  const form = event.currentTarget;
  const elements = form.elements;
  const id = elements.namedItem('id').value;
  const messageDate = elements.namedItem('message-date').value;
  const message = elements.namedItem('message').value;
  const reply = elements.namedItem('reply').value;
  const value = elements.namedItem('value').value;
  const res = await fetch(form.action, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, messageDate, message, reply, value }),
  });
  if (res.ok) {
    const { replyDate, imageBase64 } = await res.json();
    const item = replySuccessTemplate.cloneNode(true);
    const messageDateElm = item.querySelector('.message-date');
    const messageElm = item.querySelector('.message');
    const replyDateElm = item.querySelector('.reply-date');
    const replyElm = item.querySelector('.reply');
    const imageElm = item.querySelector('.image');
    const linkElm = item.querySelector('.link');
    const tweetElm = item.querySelector('.tweet-link');
    messageDateElm.textContent = messageDate;
    messageElm.textContent = message;
    replyDateElm.textContent = replyDate;
    replyElm.textContent = reply;
    imageElm.src = `data:image/png;base64,${imageBase64}`;
    imageElm.alt = message;
    linkElm.href = `/posts/${id}.html`;
    form.parentNode.replaceChild(item, form);
    const newIndex = [];
    for (const e of index[tab]) {
      if (e.id !== id) newIndex.push(e);
    }
    index[tab] = newIndex;
    updateCount(newIndex.length);

    try {
      const url = new URL('https://api.vercel.com/v6/deployments');
      const params = new URLSearchParams();
      const opts = { headers: { 'authorization': `Bearer ${vercelToken}` } };
      params.append('limit', '1');
      params.append('projectId', projectId);
      params.append('since', now);
      url.search = params;
      let isReady = false;
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => {
          setTimeout(resolve, (i === 0) ? 8000 : 1000);
        });
        const res = await fetch(url, opts);
        if (!res.ok) throw new Error();
        const { deployments } = await res.json();
        if (deployments.length === 0 || deployments[0].state !== 'READY') {
          continue;
        }
        isReady = true;
        break;
      }
      if (!isReady) throw new Error();
      const tweet = new URL('https://twitter.com/intent/tweet');
      const tweetParams = new URLSearchParams();
      tweetParams.append('text', `${reply} ${linkElm.href}`);
      tweet.search = tweetParams;
      tweetElm.href = tweet;
      tweetElm.hidden = false;
    } catch (e) {}
  } else {
    window.alert(`제출 실패: ${res.status}\n\n${await res.text()}`);
  }
}

async function submitModify(event) {
  event.preventDefault();
  if (!window.confirm('제출합니까?')) return;
  const form = event.currentTarget;
  const elements = form.elements;
  const id = elements.namedItem('id').value;
  const reply = elements.namedItem('reply').value;
  const res = await fetch(form.action, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, reply }),
  });
  if (res.ok) {
    const { replyDate } = await res.json();
    const replyDateElm = form.querySelector('.reply-date');
    const replyElm = form.querySelector('.reply');
    replyDateElm.textContent = replyDate;
    replyElm.textContent = reply;
    for (let i = 0, length = index[tab].length; i < length; i++) {
      if (index[tab][i].id !== id) continue;
      index[tab][i].replyDate = replyDate;
      index[tab][i].reply = reply;
      break;
    }
    window.alert('제출 성공');
  } else {
    window.alert(`제출 실패: ${res.status}\n\n${await res.text()}`);
  }
}

async function submitDelete(event) {
  event.preventDefault();
  if (deleteIds[tab].size === 0) return;
  if (!window.confirm('삭제합니까?')) return;
  const data = {};
  if (tab === 'unreplied') {
    data[tab] = [];
    for (const e of index[tab]) {
      if (deleteIds[tab].has(e.id)) data[tab].push(JSON.stringify(e));
    }
  } else {
    data[tab] = [...deleteIds[tab]];
  }
  const form = event.currentTarget;
  const res = await fetch(form.action, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (res.ok) {
    const newIndex = [];
    for (const e of index[tab]) {
      if (!deleteIds[tab].has(e.id)) newIndex.push(e);
    }
    index[tab] = newIndex;
    deleteIds[tab].clear();
    changeTab(tab);
    window.alert('삭제 성공');
  } else {
    window.alert(`삭제 실패: ${res.status}\n\n${await res.text()}`);
  }
}

})();
