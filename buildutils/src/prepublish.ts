/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import * as utils from './utils';

utils.run('jlpm run clean:slate');
utils.run('jlpm run build:packages');
utils.run('jlpm run build:themes');
utils.run('jlpm integrity');
