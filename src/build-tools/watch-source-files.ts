import path from 'path';
import chokidar from 'chokidar';
import { compileOrCopyFile } from './compile-file';

const srcDir = path.join(__dirname, '..', '..', 'src');
const distDir = path.join(__dirname, '..', '..', 'dist');

function watchFiles(paths: string | readonly string[], onComplete: () => void, options?: chokidar.WatchOptions) {
  let timeout: NodeJS.Timeout;
  let jobCount = 0;
  const scheduleTimeout = () => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      if (jobCount) {
        scheduleTimeout();
        return;
      }
      timeout = undefined;
      onComplete();
    }, 500);
  };
  const addJob = async (func: (arg0: string) => Promise<void>, arg0: string) => {
    try {
      jobCount++;
      await func(arg0);
      scheduleTimeout();
    } catch (err) {
      console.log(err.stack);
    } finally {
      jobCount--;
    }
  };

  const watcher = chokidar.watch(paths, options);
  watcher
    .on('error', (error) => console.error(`Watcher error: ${error}`))
    .on('ready', () => {
      console.log('Initial scan complete. Ready for changes');
      scheduleTimeout();
    });
  watcher
    .on('add', addJob.bind(null, onAddFile))
    .on('change', addJob.bind(null, onChangeFile))
    .on('unlink', addJob.bind(null, onRemoveFile));
}

async function onAddFile(filePath: string): Promise<void> {
  console.log(`File ${filePath} has been added`);
  await compileOrCopyFile(path.join(srcDir, filePath), path.join(distDir, filePath));
}

async function onChangeFile(filePath: string): Promise<void> {
  console.log(`File ${filePath} has been changed`);
  await compileOrCopyFile(path.join(srcDir, filePath), path.join(distDir, filePath));
}

async function onRemoveFile(filePath: string): Promise<void> {
  console.log(`File ${filePath} has been removed (TODO)`);
  // TODO: remove all related files
}

export function watchSourceFiles(onComplete: () => void): void {
  watchFiles('./**/*.(rivia|yaml|ejs|json|svg)', onComplete, {
    ignored: (path) => path.includes('.github'),
    cwd: srcDir,
    ignoreInitial: true,
  });
}
