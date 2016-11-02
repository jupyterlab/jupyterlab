// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  CommandRegistry
} from 'phosphor/lib/ui/commandregistry';

import {
  CommandLinker
} from '../../../lib/commandlinker/linker';


describe('linker/linker', () => {

  describe('CommandLinker', () => {

    describe('#constructor()', () => {

      it('should create a completer handler', () => {
        let linker = new CommandLinker({
          commands: new CommandRegistry()
        });
        expect(linker).to.be.a(CommandLinker);
      });

    });

  });

});
