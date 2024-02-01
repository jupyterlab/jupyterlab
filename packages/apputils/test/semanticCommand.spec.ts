/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { SemanticCommand } from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';

describe('@jupyterlab/apputils', () => {
  describe('SemanticCommand', () => {
    let semanticCmd: SemanticCommand;

    beforeEach(() => {
      semanticCmd = new SemanticCommand();
    });

    describe('#add', () => {
      it('should add a new command', () => {
        const commandId = 'test:command';
        let test = 2;
        semanticCmd.add({
          id: commandId,
          isEnabled: () => test === 2,
          rank: 10
        });

        expect(semanticCmd.getActiveCommandId(new Widget())).toEqual(commandId);
      });

      it('should add a command with default rank if not provided', () => {
        semanticCmd.add({
          id: 'not:selected',
          rank: SemanticCommand.DEFAULT_RANK + 1
        });

        const commandId = 'test:command';
        semanticCmd.add({
          id: commandId
        });

        expect(semanticCmd.getActiveCommandId(new Widget())).toEqual(commandId);
      });

      it('should add an enabled command if isEnabled not provided', () => {
        semanticCmd.add({
          id: 'not:selected',
          isEnabled: () => false
        });

        const commandId = 'test:command';
        semanticCmd.add({
          id: commandId
        });

        expect(semanticCmd.getActiveCommandId(new Widget())).toEqual(commandId);
      });

      it('should reject adding a command with an already used id', () => {
        const commandId = 'test:command';
        semanticCmd.add({
          id: commandId
        });

        expect(() => {
          semanticCmd.add({ id: commandId });
        }).toThrow(/Command\s.+\sis already defined\./);
      });
    });

    describe('#getActiveCommandId', () => {
      it('should return null if no command is defined', () => {
        expect(semanticCmd.getActiveCommandId(new Widget())).toBeNull();
      });

      it('should return null if no command is enabled', () => {
        semanticCmd.add({
          id: 'test:disabled',
          isEnabled: () => false
        });
        expect(semanticCmd.getActiveCommandId(new Widget())).toBeNull();
      });

      it('should return the enabled command with the smallest rank', () => {
        semanticCmd.add({
          id: 'not:selected',
          rank: 20
        });

        const commandId = 'test:command';
        semanticCmd.add({
          id: commandId,
          rank: 10
        });

        expect(semanticCmd.getActiveCommandId(new Widget())).toEqual(commandId);
      });
    });
  });
});
