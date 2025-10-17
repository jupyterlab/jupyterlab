// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDebugger } from '../src/tokens';
import { DebuggerModel, VariablesFilterOptionKey } from '../src/model';

describe('DebuggerModel', () => {
  describe('filterVariablesByViewOptions', () => {
    const mockVariables: IDebugger.IVariable[] = [
      {
        name: 'myVariable',
        type: 'str',
        value: 'hello',
        variablesReference: 0
      },
      {
        name: '_privateVar',
        type: 'int',
        value: '42',
        variablesReference: 0
      },
      {
        name: '__specialVar',
        type: 'list',
        value: '[1, 2, 3]',
        variablesReference: 0
      },
      {
        name: 'CONSTANT',
        type: 'str',
        value: 'IMMUTABLE',
        variablesReference: 0
      },
      {
        name: 'MyClass',
        type: 'object',
        value: '<MyClass instance>',
        variablesReference: 0
      },
      {
        name: 'module',
        type: 'module',
        value: '<module>',
        variablesReference: 0
      },
      {
        name: 'UPPERCASE_VAR',
        type: 'str',
        value: 'CONSTANT_VALUE',
        variablesReference: 0
      }
    ];

    it('should filter out module variables when module filter is enabled', () => {
      const filterOptions = new Map<VariablesFilterOptionKey, boolean>([
        ['module', true],
        ['private', false],
        ['allCaps', false],
        ['capitalized', false]
      ]);

      const result = new DebuggerModel({
        config: {} as any,
        notebookTracker: null,
        consoleTracker: null
      }).filterVariablesByViewOptions(mockVariables, filterOptions);

      expect(result).toHaveLength(6);
      expect(result.find(v => v.name === 'module')).toBeUndefined();
      expect(result.find(v => v.name === 'myVariable')).toBeDefined();
    });

    it('should filter out private variables when private filter is enabled', () => {
      const filterOptions = new Map<VariablesFilterOptionKey, boolean>([
        ['module', false],
        ['private', true],
        ['allCaps', false],
        ['capitalized', false]
      ]);

      const result = new DebuggerModel({
        config: {} as any,
        notebookTracker: null,
        consoleTracker: null
      }).filterVariablesByViewOptions(mockVariables, filterOptions);

      expect(result).toHaveLength(5);
      expect(result.find(v => v.name === '_privateVar')).toBeUndefined();
      expect(result.find(v => v.name === '__specialVar')).toBeUndefined();
      expect(result.find(v => v.name === 'myVariable')).toBeDefined();
    });

    it('should filter out all-caps variables when allCaps filter is enabled', () => {
      const filterOptions = new Map<VariablesFilterOptionKey, boolean>([
        ['module', false],
        ['private', false],
        ['allCaps', true],
        ['capitalized', false]
      ]);

      const result = new DebuggerModel({
        config: {} as any,
        notebookTracker: null,
        consoleTracker: null
      }).filterVariablesByViewOptions(mockVariables, filterOptions);

      expect(result).toHaveLength(5);
      expect(result.find(v => v.name === 'CONSTANT')).toBeUndefined();
      expect(result.find(v => v.name === 'UPPERCASE_VAR')).toBeUndefined();
      expect(result.find(v => v.name === 'myVariable')).toBeDefined();
    });

    it('should filter out capitalized variables when capitalized filter is enabled', () => {
      const filterOptions = new Map<VariablesFilterOptionKey, boolean>([
        ['module', false],
        ['private', false],
        ['allCaps', false],
        ['capitalized', true]
      ]);

      const result = new DebuggerModel({
        config: {} as any,
        notebookTracker: null,
        consoleTracker: null
      }).filterVariablesByViewOptions(mockVariables, filterOptions);

      expect(result).toHaveLength(6);
      expect(result.find(v => v.name === 'MyClass')).toBeUndefined();
      // All-caps variables should still be included (not filtered by capitalized)
      expect(result.find(v => v.name === 'CONSTANT')).toBeDefined();
      expect(result.find(v => v.name === 'myVariable')).toBeDefined();
    });

    it('should apply multiple filters when multiple options are enabled', () => {
      const filterOptions = new Map<VariablesFilterOptionKey, boolean>([
        ['module', true],
        ['private', true],
        ['allCaps', false],
        ['capitalized', false]
      ]);

      const result = new DebuggerModel({
        config: {} as any,
        notebookTracker: null,
        consoleTracker: null
      }).filterVariablesByViewOptions(mockVariables, filterOptions);

      expect(result).toHaveLength(4);
      expect(result.find(v => v.name === 'module')).toBeUndefined();
      expect(result.find(v => v.name === '_privateVar')).toBeUndefined();
      expect(result.find(v => v.name === '__specialVar')).toBeUndefined();
      expect(result.find(v => v.name === 'myVariable')).toBeDefined();
    });

    it('should return all variables when no filters are enabled', () => {
      const filterOptions = new Map<VariablesFilterOptionKey, boolean>([
        ['module', false],
        ['private', false],
        ['allCaps', false],
        ['capitalized', false]
      ]);

      const result = new DebuggerModel({
        config: {} as any,
        notebookTracker: null,
        consoleTracker: null
      }).filterVariablesByViewOptions(mockVariables, filterOptions);

      expect(result).toHaveLength(7);
      expect(result).toEqual(mockVariables);
    });

    it('should handle empty variables array', () => {
      const filterOptions = new Map<VariablesFilterOptionKey, boolean>([
        ['module', true],
        ['private', true],
        ['allCaps', true],
        ['capitalized', true]
      ]);

      const result = new DebuggerModel({
        config: {} as any,
        notebookTracker: null,
        consoleTracker: null
      }).filterVariablesByViewOptions([], filterOptions);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should handle variables with undefined type', () => {
      const variablesWithUndefinedType: IDebugger.IVariable[] = [
        {
          name: 'testVar',
          type: undefined as any,
          value: 'test',
          variablesReference: 0
        }
      ];

      const filterOptions = new Map<VariablesFilterOptionKey, boolean>([
        ['module', true],
        ['private', false],
        ['allCaps', false],
        ['capitalized', false]
      ]);

      const result = new DebuggerModel({
        config: {} as any,
        notebookTracker: null,
        consoleTracker: null
      }).filterVariablesByViewOptions(
        variablesWithUndefinedType,
        filterOptions
      );

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('testVar');
    });
  });
});
