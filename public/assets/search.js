(function () {

var queryRaw = getQuery();
var query = decodeQuery();
var queries = splitQuery();
var page = getPage();
var xhr = new XMLHttpRequest();
var cache = {};
var data, field, stats, pagers, list, itemTemplate, perPage;

window.addEventListener('popstate', function () {
  queryRaw = getQuery();
  query = decodeQuery();
  queries = splitQuery();
  page = getPage();
  field.value = query;
  search();
});

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('search-form');
  var pagerCollection = document.getElementsByClassName('pager');
  var i, pager, first, prev, next, last, firstLink, prevLink, nextLink, lastLink;
  field = document.getElementById('search-field');
  stats = document.getElementById('post-stats');
  list = document.getElementById('post-list');
  itemTemplate = document.getElementById('post-item-template').content.firstElementChild;
  perPage = parseInt(list.dataset.perPage);
  form.onsubmit = updateQuery;
  pagers = [];
  for (i = 0; pager = pagerCollection[i], pager; i++) {
    first = pager.getElementsByClassName('pager-first')[0];
    prev = pager.getElementsByClassName('pager-prev')[0];
    next = pager.getElementsByClassName('pager-next')[0];
    last = pager.getElementsByClassName('pager-last')[0];
    firstLink = first.getElementsByTagName('a')[0];
    prevLink = prev.getElementsByTagName('a')[0];
    nextLink = next.getElementsByTagName('a')[0];
    lastLink = last.getElementsByTagName('a')[0];
    firstLink.dataset.page = 1;
    firstLink.onclick = updatePage;
    prevLink.onclick = updatePage;
    nextLink.onclick = updatePage;
    lastLink.onclick = updatePage;
    pagers.push({
      pager: pager,
      first: first,
      prev: prev,
      next: next,
      last: last,
      curr: pager.getElementsByClassName('pager-curr')[0],
      firstLink: firstLink,
      prevLink: prevLink,
      nextLink: nextLink,
      lastLink: lastLink,
    });
  }

  if (!query) return;
  field.value = query;
  updateLoadingCounter(-1);
});

document.documentElement.classList.add('js-search');
if (query) updateLoadingCounter(1);

xhr.onloadend = function () {
  if (xhr.status >= 200 && xhr.status < 300) data = JSON.parse(xhr.response);
  if (!data) {
    document.documentElement.classList.remove('js-search');
    return;
  }
  if (!queries) return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', search);
  } else {
    search();
  }
};
xhr.open('GET', '/search/data.json');
xhr.send();

function updateLoadingCounter(v) {
  var count = parseInt(document.documentElement.dataset.loading);
  if (isNaN(count)) count = 0;
  count += v;
  if (count <= 0) {
    delete document.documentElement.dataset.loading;
  } else {
    document.documentElement.dataset.loading = count;
  }
}

function getURL(p) {
  if (p === undefined) p = page;
  return '/search/?q=' + queryRaw + '&p=' + p;
}

function getPage() {
  var arr = location.search.match(/[?&]p=([^&]*)/);
  if (!arr) return 1;
  var p = parseInt(arr[1]);
  return isNaN(p) ? 1 : p;
}

function getQuery() {
  var arr = location.search.match(/[?&]q=([^&]*)/);
  return (arr) ? arr[1] : '';
}

function decodeQuery() {
  return decodeURIComponent(queryRaw).replace(/\+/g, ' ');
}

function encodeQuery() {
  return encodeURIComponent(query).replace(/%20/g, '+');
}

function splitQuery(q) {
  if (q === undefined) q = query;
  if (!q) return null;
  var splited = q.split(/"(.+)"|(\S+)/);
  var arr = [];
  var i, len, e;
  for (i = 0, len = splited.length; i < len; i++) {
    e = splited[i];
    if (!e) continue;
    e = e.trim();
    if (e) arr.push(e.toLowerCase());
  }
  if (arr.length === 0) return null;
  arr.sort(function (a, b) {
    return b.length - a.length;
  });
  return arr;
}

function updateQuery(e) {
  e.preventDefault();
  var q = field.value;
  var qs = splitQuery(q);
  if (!qs) return;
  if (q !== query) {
    query = q;
    queries = qs;
    queryRaw = encodeQuery();
  }
  page = 1;
  history.pushState({}, undefined, getURL());
  search();
}

function updatePage(e) {
  e.preventDefault();
  page = parseInt(e.currentTarget.dataset.page);
  history.pushState({}, undefined, getURL());
  search();
}

function search() {
  var i, e, listNew;

  if (!queries) {
    for (i = 0; e = pagers[i], e; i++) {
      e.pager.hidden = true;
    }
    stats.textContent = '';
    listNew = list.cloneNode();
    list.parentNode.replaceChild(listNew, list);
    list = listNew;
    return;
  }

  var results = cache[query] ? cache[query].results : (function () {
    var arr = [];
    var i, j, e, q, message, reply, flag;
    for (i = 0; e = data[i], e; i++) {
      message = e.message.toLowerCase();
      reply = e.reply.toLowerCase();
      flag = true;
      for (j = 0, q; q = queries[j], q; j++) {
        if (message.indexOf(q) > -1 || reply.indexOf(q) > -1) continue;
        flag = false;
        break;
      }
      if (flag) arr.push(e);
    }
    if (!cache[query]) cache[query] = {};
    cache[query].results = arr;
    return arr;
  })();
  var total = results.length;
  var lastPage = Math.ceil(total / perPage);

  stats.textContent = '총 ' + total + '개의 일치하는 메시지/답글';

  if (page > lastPage) {
    page = lastPage;
    history.replaceState({}, undefined, getURL());
  }

  if (total > perPage) {
    var prevPage = page - 1;
    var nextPage = page + 1;
    var firstURL = getURL('1');
    var prevURL = getURL(prevPage);
    var nextURL = getURL(nextPage);
    var lastURL = getURL(lastPage);
    var start = prevPage * perPage;

    results = results.slice(start, start + perPage);

    for (i = 0; e = pagers[i], e; i++) {
      if (prevPage > 0) {
        e.firstLink.href = firstURL;
        e.prevLink.href = prevURL;
        e.prevLink.dataset.page = prevPage;
        e.first.hidden = false;
        e.prev.hidden = false;
      } else {
        e.first.hidden = true;
        e.prev.hidden = true;
      }
      if (nextPage <= lastPage) {
        e.nextLink.href = nextURL;
        e.nextLink.dataset.page = nextPage;
        e.lastLink.href = lastURL;
        e.lastLink.dataset.page = lastPage;
        e.next.hidden = false;
        e.last.hidden = false;
      } else {
        e.next.hidden = true;
        e.last.hidden = true;
      }
      e.curr.textContent = page;
      e.pager.hidden = false;
    }
  } else {
    for (i = 0; e = pagers[i], e; i++) {
      e.pager.hidden = true;
    }
  }

  if (cache[query].lists && cache[query].lists[page]) {
    listNew = cache[query].lists[page];
  } else {
    listNew = list.cloneNode();

    var qlen = queries.length;
    var result, item, link, title, message, messageDate, reply, replyDate;
    for (i = 0; result = results[i], result; i++) {
      item = itemTemplate.cloneNode(true);
      link = item.querySelector('.post-link');
      title = item.querySelector('.post-title');
      message = item.querySelector('.post-message');
      messageDate = item.querySelector('.post-message-date');
      reply = item.querySelector('.post-reply');
      replyDate = item.querySelector('.post-reply-date');
  
      link.href = '/posts/' + result.id + '.html';
      title.textContent = titleFilter(result.messageDate);
      messageDate.textContent = dateFilter(result.messageDate);
      replyDate.textContent = dateFilter(result.replyDate);
      messageDate.setAttribute('datetime', result.messageDate);
      replyDate.setAttribute('datetime', result.replyDate);
      highlight(message, result.message, qlen);
      highlight(reply, result.reply, qlen);
  
      listNew.appendChild(item);
    }

    if (!cache[query].lists) cache[query].lists = [];
    cache[query].lists[page] = listNew;
  }
  list.parentNode.replaceChild(listNew, list);
  list = listNew;

  var loc = pagers[0].pager.getBoundingClientRect().top;
  if (loc < 0) window.scrollBy(0, loc - 12);
}

function highlight(elm, text, qlen) {
  var lcText = text.toLowerCase();
  var tlen = text.length;
  var flag = true;
  var loc = 0;
  var idxs = [];
  var i, idx, start, end, mark;
  for (i = 0; i < qlen; i++) {
    idx = lcText.indexOf(queries[i]);
    if (idx > -1) flag = false;
    idxs.push(idx);
  }
  if (flag) {
    elm.textContent = text;
    return;
  }
  do {
    start = -1;
    for (i = 0; i < qlen; i++) {
      idx = idxs[i];
      if (idx < 0) continue;
      if (idx < loc) {
        idx = lcText.indexOf(queries[i], loc);
        idxs[i] = idx;
      }
      if (start < 0 || idx < start) {
        start = idx;
        end = start + queries[i].length;
      }
    }
    if (start < 0) break;
    if (start > loc) elm.appendChild(document.createTextNode(text.slice(loc, start)));
    mark = document.createElement('mark');
    mark.textContent = text.slice(start, end);
    loc = end;
    elm.appendChild(mark);
  } while (loc < tlen);
  if (loc < tlen) elm.appendChild(document.createTextNode(text.slice(loc)));
}

function titleFilter(date) {
  var mm = date.slice(5, 7);
  var dd = date.slice(8, 10);
  if (mm[0] === '0') mm = mm[1];
  if (dd[0] === '0') dd = dd[1];
  return date.slice(2, 4) + '년 ' + mm + '월 ' + dd + '일 메시지';
}

function dateFilter(date) {
  var mm = date.slice(5, 7);
  var dd = date.slice(8, 10);
  if (mm[0] === '0') mm = mm[1];
  if (dd[0] === '0') dd = dd[1];
  var ss = date.slice(0, 4) + '년 ' + mm + '월 ' + dd + '일';
  if (date.length > 10) ss += ' ' + date.slice(11, 19);
  return ss;
}

})();
