import { readdirSync, writeFile } from 'fs';
import { readFile } from 'fs/promises';

const dataURL = new URL('../data/', import.meta.url);
const files = readdirSync(dataURL);
const promises = [];
for (const file of files) {
  if (!file.endsWith('.json')) continue;
  const path = new URL(file, dataURL);
  promises.push(readFile(path, 'utf8').then(data => JSON.parse(data)));
}
const datas = await Promise.all(promises);

for (const data of datas) {
  if (data.proxy) continue;
  data.proxy = true;
  const file = `${data.id}.json`;
  const path = new URL(file, dataURL);
  writeFile(path, JSON.stringify(data, undefined, 2) + '\n', err => {
    if (err) console.error(err);
  });
}
