/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import {
  ResolverRegistry,
  IResolverRegistry,
  IDataRegistry
} from '@jupyterlab/databus';
import { IStateDB } from '@jupyterlab/coreutils';

const id = '@jupyterlab/databus-extension:resolver-registry';
/**
 * The resolver registry extension.
 */
export default {
  activate,
  id,
  requires: [IStateDB, IDataRegistry],
  provides: IResolverRegistry,
  autoStart: true
} as JupyterLabPlugin<IResolverRegistry>;

function activate(
  app: JupyterLab,
  state: IStateDB,
  registry: IDataRegistry
): IResolverRegistry {
  const resolvers = new ResolverRegistry();
  (async () => {
    for (const uri of ((await state.fetch(id)) || []) as Array<string>) {
      const dataset = await resolvers.resolve(uri);
      if (dataset !== null) {
        registry.publish(dataset);
      }
    }
    registry.datasetsChanged.connect(async () => {
      console.log('SAVING');
      await state.save(
        id,
        [...registry.datasets].map(d => d.uri).filter(uri => uri)
      );
    });
  })();

  return resolvers;
}
