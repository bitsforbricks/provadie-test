import { compileFile } from './compile-file';
import path from 'path';

const distDir = path.join(__dirname, '..', '..', 'dist');

async function main() {
  // await compileFile(
  //   path.join(process.cwd(), 'node_modules/@fortawesome/fontawesome-pro/metadata/icons.yml'),
  //   path.join(distDir, 'tools/pdf/icons/fontawesome-metadata'),
  // );
}

main().catch((err) => console.error('Build 3rd party yaml files failed', err.stack));
