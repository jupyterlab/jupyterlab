/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as fs from 'fs-extra';
import * as path from 'path';
import * as utils from './utils';

const questions = [
  {
    type: 'input',
    name: 'name',
    message: 'name: '
  },
  {
    type: 'input',
    name: 'description',
    message: 'description: '
  }
];

void import('inquirer')
  .then(inquirer => inquirer.createPromptModule())
  .then(prompt => prompt(questions))
  .then(answers => {
    let { name, description } = answers;
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
  });
