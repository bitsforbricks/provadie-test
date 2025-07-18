import fs from 'fs';
import path from 'path';
import { compileOrCopyFile } from './compile-file';

async function getFiles(dir: string): Promise<string[]> {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.reduce<Array<string | Promise<string[]>>>((acc, dirent) => {
      if (dirent.name === '.git') {
        return acc;
      }
      const res = path.resolve(dir, dirent.name);
      acc.push(dirent.isDirectory() ? getFiles(res) : res);
      return acc;
    }, []),
  );
  return Array.prototype.concat(...files);
}

(async () => {
  const dir = path.join(__dirname, '..', '..', 'src');
  const dist = path.join(__dirname, '..', '..', 'dist');

  const files = await getFiles(dir);
  await Promise.all(
    files.map(async (filePath) => {
      const dirPath = path.join(filePath.substring(dir.length + 1), '..');
      const distDir = path.join(dist, dirPath);
      const fileName = path.basename(filePath);
      const distFile = path.join(distDir, fileName);

      if (fileName.endsWith('.ts') || (fileName.endsWith('.js') && !fileName.endsWith('.min.js'))) {
        return;
      }

      let exists = true;
      await fs.promises.stat(distDir).catch(() => (exists = false));
      if (!exists) {
        await fs.promises.mkdir(distDir, {
          recursive: true,
        });
      }

      await compileOrCopyFile(filePath, distFile);
    }),
  );
})();
