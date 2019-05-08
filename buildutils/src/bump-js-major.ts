/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import commander from 'commander';
import * as utils from './utils';

// Specify the program signature.
commander
  .description('Bump the major version of JS package(s)')
  .arguments('<package> [others...]')
  .action((pkg: string, others: Array<string>) => {
    others.push(pkg);
    const pkgs = others.join(',');
    const cmd = `lerna premajor --force-publish=${pkgs} --no-push`;
    utils.run(cmd);
  });

commander.parse(process.argv);
