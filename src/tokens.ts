// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@phosphor/coreutils';

export interface IDebugger {}

export const IDebugger = new Token<IDebugger>('@jupyterlab/debugger');
