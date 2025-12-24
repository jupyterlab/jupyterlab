/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ArrayExt, StringExt } from '@lumino/algorithm';
import type { CommandRegistry } from '@lumino/commands';
import type { PartialJSONArray } from '@lumino/coreutils';
import type {
  IKeybinding,
  ISearchResult,
  IShortcutRegistry,
  IShortcutsSettingsLayout,
  IShortcutTarget
} from './types';
import { MatchType } from './types';

/**
 * Shortcut registry used by Shortcut UI component.
 */
export class ShortcutRegistry
  extends Map<string, IShortcutTarget>
  implements IShortcutRegistry
{
  constructor(options: ShortcutRegistry.IOptions) {
    super();
    const { settings, commandRegistry } = options;

    const userBindings = settings.user.shortcuts ?? [];
    const setByUser = new Set(
      userBindings.map(this._computeKeybindingId.bind(this))
    );

    const luminoKeybindings = settings.composite.shortcuts ?? [];
    // Compute the target ID for the shortcuts defined by an extension.
    const shortcutsFromExtensions = (
      settings.default('shortcuts') as PartialJSONArray
    ).map(shortcut => {
      return this._computeTargetId(
        shortcut as unknown as CommandRegistry.IKeyBindingOptions
      );
    });

    for (const shortcut of luminoKeybindings) {
      const targetKey = this._computeTargetId(shortcut);
      const keybindingKey = this._computeKeybindingId(shortcut);

      const keybinding: IKeybinding = {
        keys: shortcut.keys,
        isDefault: !setByUser.has(keybindingKey)
      };

      const shortcutTarget = this.get(targetKey);
      if (shortcutTarget) {
        shortcutTarget.keybindings.push(keybinding);
      } else {
        const commandParts = shortcut.command.split(':');
        const label =
          commandRegistry.label(shortcut.command, shortcut.args) ??
          (commandParts.length > 1 ? commandParts[1] : undefined);
        const category = commandParts[0];
        this.set(targetKey, {
          id: targetKey,
          selector: shortcut.selector,
          command: shortcut.command,
          category,
          label,
          args: shortcut.args,
          keybindings: [keybinding],
          userDefined: !shortcutsFromExtensions.includes(targetKey)
        });
      }
    }

    if (options.allCommands) {
      const commandsWithShortcut = new Set(
        luminoKeybindings.map(keyBinding => keyBinding.command)
      );
      const commandsWithoutShortcut = commandRegistry
        .listCommands()
        .filter(command => !commandsWithShortcut.has(command));
      for (const command of commandsWithoutShortcut) {
        const shortcut: Omit<CommandRegistry.IKeyBindingOptions, 'keys'> = {
          command,
          selector: 'body'
        };
        const targetKey = this._computeTargetId(shortcut);
        const commandParts = shortcut.command.split(':');
        const label =
          commandRegistry.label(shortcut.command, shortcut.args) ??
          (commandParts.length > 1 ? commandParts[1] : undefined);
        const category = commandParts[0];
        const shortcutTarget: IShortcutTarget = {
          ...shortcut,
          id: targetKey,
          keybindings: [],
          category,
          label,
          args: {}
        };

        this.set(targetKey, shortcutTarget);
      }
    }
  }

  /**
   * Find targets that would conflict with given keys chord under given sequence.
   */
  findConflictsFor(keys: string[], selector: string): IShortcutTarget[] {
    const checker = new KeybindingsConflictChecker({ registry: this });

    // First check the full chain
    let conflicts = checker.findConflicts(keys, selector);

    if (conflicts.length !== 0) {
      return conflicts;
    }

    // Then check each piece of the chain
    for (const binding of keys) {
      conflicts = checker.findConflicts([binding], selector);
      if (conflicts.length !== 0) {
        return conflicts;
      }
    }

    return [];
  }

  private _computeTargetId(
    shortcut: Omit<CommandRegistry.IKeyBindingOptions, 'keys'>
  ) {
    return (
      shortcut.command +
      '_' +
      shortcut.selector +
      '_' +
      JSON.stringify(shortcut.args ?? {})
    );
  }

  private _computeKeybindingId(shortcut: CommandRegistry.IKeyBindingOptions) {
    return [
      shortcut.command,
      shortcut.selector,
      JSON.stringify(shortcut.args ?? {}),
      shortcut.keys.join(' ')
    ].join('_');
  }
}

/**
 * Allows checking if a given keybinding is available, or directly conflicts with other targets.
 */
class KeybindingsConflictChecker {
  constructor(options: { registry: ShortcutRegistry }) {
    const keybindingsMap = new Map<string, IShortcutTarget[]>();
    for (const shortcutTarget of options.registry.values()) {
      for (const keybinding of shortcutTarget.keybindings) {
        const hash = this._keybindingHash(
          keybinding.keys,
          shortcutTarget.selector
        );
        const list = keybindingsMap.get(hash) ?? [];
        list.push(shortcutTarget);
        keybindingsMap.set(hash, list);
      }
    }
    this._keybindingsMap = keybindingsMap;
  }

  findConflicts(keys: string[], selector: string): IShortcutTarget[] {
    const hash = this._keybindingHash(keys, selector);
    return this._keybindingsMap.get(hash) ?? [];
  }

  private _keybindingHash(keys: string[], selector: string): string {
    return keys.join(' ') + '_' + selector;
  }

  private _keybindingsMap: Map<string, IShortcutTarget[]>;
}

/**
 * Interfaces for ShortcutRegistry class.
 */
export namespace ShortcutRegistry {
  /**
   * Initialization options for ShortcutRegistry
   */
  export interface IOptions {
    /**
     * Read-only command registry.
     */
    commandRegistry: Omit<CommandRegistry, 'execute'>;
    /**
     * Shortcut settings.
     */
    settings: ISettingRegistry.ISettings<IShortcutsSettingsLayout>;
    /**
     * Display the list of all the commands.
     */
    allCommands?: boolean;
  }

  /** Normalize the query text for a fuzzy search. */
  function normalizeQuery(text: string): string {
    return text.replace(/\s+/g, '').toLowerCase();
  }

  /** Perform a fuzzy search on a single command item. */
  function fuzzySearch(
    item: IShortcutTarget,
    query: string
  ): ISearchResult | null {
    // Create the source text to be searched.
    const category = item.category.toLowerCase();
    const label = (item['label'] ?? '').toLowerCase();
    const source = `${category} ${label}`;

    // Set up the match score and indices array.
    let score = Infinity;
    let indices: number[] | null = null;

    // The regex for search word boundaries
    const rgx = /\b\w/g;

    // Search the source by word boundary.
    // eslint-disable-next-line
    while (true) {
      // Find the next word boundary in the source.
      const rgxMatch = rgx.exec(source);

      // Break if there is no more source context.
      if (!rgxMatch) {
        break;
      }

      // Run the string match on the relevant substring.
      const match = StringExt.matchSumOfDeltas(source, query, rgxMatch.index);

      // Break if there is no match.
      if (!match) {
        break;
      }

      // Update the match if the score is better.
      if (match && match.score <= score) {
        score = match.score;
        indices = match.indices;
      }
    }

    // Bail if there was no match.
    if (!indices || score === Infinity) {
      return null;
    }

    // Compute the pivot index between category and label text.
    const pivot = category.length + 1;

    // Find the slice index to separate matched indices.
    const j = ArrayExt.lowerBound(indices, pivot, (a, b) => a - b);

    // Extract the matched category and label indices.
    const categoryIndices = indices.slice(0, j);
    const labelIndices = indices.slice(j);

    // Adjust the label indices for the pivot offset.
    for (let i = 0, n = labelIndices.length; i < n; ++i) {
      labelIndices[i] -= pivot;
    }

    // Handle a pure label match.
    if (categoryIndices.length === 0) {
      return {
        matchType: MatchType.Label,
        categoryIndices: null,
        labelIndices,
        score,
        item
      };
    }

    // Handle a pure category match.
    if (labelIndices.length === 0) {
      return {
        matchType: MatchType.Category,
        categoryIndices,
        labelIndices: null,
        score,
        item
      };
    }

    // Handle a split match.
    return {
      matchType: MatchType.Split,
      categoryIndices,
      labelIndices,
      score,
      item
    };
  }

  /** Perform a fuzzy match on an array of command items. */
  export function matchItems(
    items: IShortcutRegistry,
    query: string
  ): ISearchResult[] {
    // Normalize the query text to lower case with no whitespace.
    query = normalizeQuery(query);

    // Create the array to hold the scores.
    let scores: ISearchResult[] = [];

    // Iterate over the items and match against the query.
    for (const item of items.values()) {
      // If the query is empty, all items are matched by default.
      if (!query) {
        scores.push({
          matchType: MatchType.Default,
          categoryIndices: null,
          labelIndices: null,
          score: 0,
          item
        });
        continue;
      }

      // Run the fuzzy search for the item and query.
      let score = fuzzySearch(item, query);

      // Ignore the item if it is not a match.
      if (!score) {
        continue;
      }

      // Add the score to the results.
      scores.push(score);
    }

    // Return the final array of scores.
    return scores;
  }
}
