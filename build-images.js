import { mkdirSync, readdirSync, writeFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import ImageBuilder from './image/image-builder.js';

const TXT_OPTS = { encoding: 'utf8' };

const root = fileURLToPath(dirname(import.meta.url));
const temp = 'Z:/TEMP';
const dataDir = join(root, 'data');
const imageDir = join(temp, 'images1');
const fonts = await Promise.all((() => {
  const dir = join(root, 'image', 'fonts');
  const files = config.fontFiles;
  const promises = [];
  for (const file of files) {
    promises.push(readFile(join(dir, file)));
  }
  return promises;
})());
const files = readdirSync(dataDir).slice(500);
const datas = await Promise.all((() => {
  const promises = [];
  for (const file of files) {
    promises.push(readFile(join(dataDir, file), TXT_OPTS).then(data => {
      const { id, message } = JSON.parse(data);
      return { id, message };
    }));
  }
  return promises;
})());

mkdirSync(imageDir, { recursive: true });

const image = new ImageBuilder(fonts);
for (const data of datas) {
  const { id, message } = data;
  writeFileSync(join(imageDir, `${id}.png`), image.generate(message));
}
image.free();
