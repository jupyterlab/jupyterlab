// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ContentsManager } from '@jupyterlab/services';

import { log } from './log';

export async function main(): Promise<void> {
  const contents = new ContentsManager();

  log('Create a new directory');
  const model = await contents.newUntitled({ path: '/', type: 'directory' });
  log(`Created directory ${model.path}`);

  log('Move the new directory to /tmp');
  await contents.rename(model.path, '/tmp');

  log('Create new python file');
  const model2 = await contents.newUntitled({
    path: '/tmp',
    type: 'file',
    ext: 'py'
  });
  log(`Created ${model2.path}`);

  log('Rename file');
  await contents.rename(model2.path, '/tmp/foo.txt');

  log('Get contents of /tmp');
  await contents.get('/tmp');

  log('Save a file');
  await contents.save('/tmp/bar.txt');

  log('Copy a file');
  const model3 = await contents.copy('/tmp/bar.txt', '/tmp');
  log(`Copied to ${model3.path}`);

  log('Create a checkpoint');
  const checkpoint = await contents.createCheckpoint('/tmp/bar.txt');

  log('Restore a checkpoint');
  await contents.restoreCheckpoint('/tmp/bar.txt', checkpoint.id);

  log('List checkpoints for a file');
  const models2 = await contents.listCheckpoints('/tmp/bar.txt');
  log(models2[0].id);

  log('Delete a checkpoint');
  await contents.deleteCheckpoint('/tmp/bar.txt', checkpoint.id);

  log('Delete a file');
  await contents.delete('/tmp/bar.txt');
}
