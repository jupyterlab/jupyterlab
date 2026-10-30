/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as fs from 'fs-extra';
import * as path from 'path';
import * as readline from 'readline';
import * as utils from './utils';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
// Unlike `rl.question`, the iterator keeps lines that arrive before they are asked for.
const lines = rl[Symbol.asyncIterator]();

async function ask(question: string): Promise<string> {
  rl.setPrompt(question);
  rl.prompt();
  const result = await lines.next();
  return result.done ? '' : result.value;
}

async function main(): Promise<void> {
  let name = await ask('name: ');
  const description = await ask('description: ');
  rl.close();

  const dest = path.resolve(path.join('.', 'packages', name));
  if (fs.existsSync(dest)) {
    console.error('Package already exists: ', name);
    process.exit(1);
  }
  fs.copySync(path.resolve(path.join(__dirname, '..', 'template')), dest);
  const jsonPath = path.join(dest, 'package.json');
  const data = utils.readJSONFile(jsonPath);
  if (name.indexOf('@jupyterlab/') === -1) {
    name = '@jupyterlab/' + name;
  }
  data.name = name;
  data.description = description;
  utils.writePackageData(jsonPath, data);

  // Add the launch file to git.
  const launch = path.join(dest, '.vscode', 'launch.json');
  utils.run(`git add -f ${launch}`);

  // Use npm here so this file can be used outside of JupyterLab.
  utils.run('npm run integrity');
}

void main();
