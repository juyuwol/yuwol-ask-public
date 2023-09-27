import { readFileSync, writeFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import ImageBuilder from './image/image-builder.js';

const id = 'ln22c5630';
const message = JSON.parse(readFileSync(`data/${id}.json`, 'utf8')).message;

const root = fileURLToPath(dirname(import.meta.url));
const fonts = await Promise.all((() => {
  const dir = join(root, 'image', 'fonts');
  const files = config.fontFiles;
  const promises = [];
  for (const file of files) {
    promises.push(readFile(join(dir, file)));
  }
  return promises;
})());

const image = new ImageBuilder(fonts);
writeFileSync(join(root, 'public', 'images', `${id}.png`), image.generate(message));
image.free();
