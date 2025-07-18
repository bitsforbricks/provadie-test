import path from 'path';
import fs from 'fs/promises';

let cachedMapIcons;

export const getMapIcons = async () => {
  if (cachedMapIcons) {
    return cachedMapIcons;
  }
  // TODO: optimize this as this is allocating quite a lot of memory

  const iconsDir = path.join(__dirname, 'icons');
  const fileNames = await fs.readdir(iconsDir);
  const result = {};
  for (let index = 0; index < fileNames.length; index++) {
    const fileName = fileNames[index];
    const ext = path.extname(fileName);
    if (ext === '.svg') {
      const content = await fs.readFile(path.join(iconsDir, fileName), { encoding: 'utf-8' });
      const key = path.basename(fileName, ext);
      result[key] = content;
    }
  }
  cachedMapIcons = result;
  return cachedMapIcons;
};
