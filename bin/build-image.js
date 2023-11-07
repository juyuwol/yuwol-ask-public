import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { readFile } from 'fs/promises';
import config from '../config.js';
import ImageBuilder from '../scripts/image-builder.js';

const id = process.argv[2];
if (!id) process.exit(1);

const dirURL = import.meta.url;
const imageDir = 'Z:/TEMP';

const fonts = await Promise.all((() => {
  const files = config.fontFiles;
  const promises = [];
  for (const file of files) {
    promises.push(readFile(new URL(`../assets/${file}`, dirURL)));
  }
  return promises;
})());

const file = new URL(`../data/${id}.json`, dirURL);
const { message } = JSON.parse(readFileSync(file, 'utf8'));

mkdirSync(imageDir, { recursive: true });

const builder = new ImageBuilder(fonts);
writeFileSync(`${imageDir}/${id}.png`, builder.generate(message).data);
builder.free();
