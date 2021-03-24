/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { WebsocketProvider } from 'y-websocket';

export const DOC_PROVIDER_TYPE = 'ws_yjs';

class YWebsocketProvider extends WebsocketProvider {}

export default YWebsocketProvider;
