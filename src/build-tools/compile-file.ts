import fs from 'fs';
import yaml from 'yaml';
import path from 'path';

export async function compileFile(filePath: string, distFile: string): Promise<boolean> {
  if (filePath.endsWith('.rivia')) {
    return true;
  }
  if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
    const data = await fs.promises.readFile(filePath, 'utf8');
    const content = yaml.parse(data);
    await fs.promises.writeFile(`${distFile}.js`, `module.exports = ${JSON.stringify(content, null, 2)}`);
    return true;
  }
  return false;
}

export async function compileOrCopyFile(filePath: string, distFile: string): Promise<void> {
  if (await compileFile(filePath, distFile)) {
    return;
  }
  const dirname = path.dirname(distFile);
  await fs.promises.mkdir(dirname, { recursive: true });
  await fs.promises.copyFile(filePath, distFile);
}
