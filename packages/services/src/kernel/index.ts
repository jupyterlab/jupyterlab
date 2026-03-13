// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Namespace some of our modules for convenience and backwards compatibility.
import { CommsOverSubshells } from './comm';
import * as Kernel from './kernel';
import * as KernelMessage from './messages';
import * as KernelAPI from './restapi';
import { KernelConnection } from './default';

export * from './manager';
export {
  Kernel,
  KernelMessage,
  KernelAPI,
  KernelConnection,
  CommsOverSubshells
};
