import { watchSourceFiles } from './watch-source-files';
import { spawn } from 'child_process';
import path from 'path';

let devServer: ReturnType<typeof spawn>;
const rootDir = path.join(__dirname, '..', '..');

function runDevelopEntrypoint() {
  if (devServer) {
    devServer.kill('SIGKILL');
  }
  devServer = spawn(process.argv0, ['./dist/develop-entrypoint.js'], {
    cwd: rootDir,
  });
  devServer.on('error', (err) => {
    console.log('DevServer error', err);
  });
  devServer.on('close', () => {
    console.log('DevServer closed');
  });
  devServer.stdout.pipe(process.stdout);
  devServer.stderr.pipe(process.stderr);
}

watchSourceFiles(runDevelopEntrypoint);
