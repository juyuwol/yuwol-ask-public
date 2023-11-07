import { mkdirSync, readdirSync, writeFileSync } from 'fs';
import { readFile } from 'fs/promises';
import config from '../config.js';
import ImageBuilder from '../scripts/image-builder.js';

const dirURL = import.meta.url;
const dataURL = new URL('../data/', dirURL);
const imageDir = 'Z:/TEMP';

const fonts = await Promise.all((() => {
  const files = config.fontFiles;
  const promises = [];
  for (const file of files) {
    promises.push(readFile(new URL(`../assets/${file}`, dirURL)));
  }
  return promises;
})());

const datas = await Promise.all((() => {
  const files = readdirSync(dataURL);
  const promises = [];
  for (const file of files) {
    promises.push(readFile(new URL(file, dataURL), 'utf8').then(data => {
      const { id, message } = JSON.parse(data);
      return { id, message };
    }));
  }
  return promises;
})());

mkdirSync(imageDir, { recursive: true });

const builder = new ImageBuilder(fonts);
for (const data of datas) {
  const { id, message } = data;
  writeFileSync(`${imageDir}/${id}.png`, builder.generate(message).data);
}
builder.free();
