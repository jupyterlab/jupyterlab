import { PageConfig } from '@jupyterlab/coreutils';
import { ReadonlyJSONObject, ReadonlyJSONValue } from '@lumino/coreutils';
import mergeWith from 'lodash.mergewith';

const RE_PATH_ANCHOR = /^file:\/\/([^\/]+|\/[a-zA-Z](?::|%3A))/;

export async function sleep(timeout: number) {
  return new Promise<void>(resolve => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}

// TODO: there is a JL native version of this which uses adaptive rate, maybe use instead?
export function until_ready(
  is_ready: any,
  max_retrials: number = 35,
  interval = 50,
  interval_modifier = (i: number) => i
) {
  return new Promise(async (resolve, reject) => {
    let i = 0;
    while (is_ready() !== true) {
      i += 1;
      if (max_retrials !== -1 && i > max_retrials) {
        reject('Too many retrials');
        break;
      }
      interval = interval_modifier(interval);
      await sleep(interval);
    }
    resolve(is_ready);
  });
}

export type ModifierKey =
  | 'Shift'
  | 'Alt'
  | 'AltGraph'
  | 'Control'
  | 'Meta'
  | 'Accel';

/**
 * CodeMirror-proof implementation of event.getModifierState()
 */
export function getModifierState(
  event: MouseEvent | KeyboardEvent,
  modifierKey: ModifierKey
): boolean {
  // Note: Safari does not support getModifierState on MouseEvent, see:
  // https://github.com/krassowski/jupyterlab-go-to-definition/issues/3
  // thus AltGraph and others are not supported on Safari
  // Full list of modifier keys and mappings to physical keys on different OSes:
  // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/getModifierState

  // the key approach is needed for CodeMirror events which do not set
  // *key (e.g. ctrlKey) correctly
  const key = (event as KeyboardEvent).key || null;
  let value = false;

  switch (modifierKey) {
    case 'Shift':
      value = event.shiftKey || key == 'Shift';
      break;
    case 'Alt':
      value = event.altKey || key == 'Alt';
      break;
    case 'AltGraph':
      value = key == 'AltGraph';
      break;
    case 'Control':
      value = event.ctrlKey || key == 'Control';
      break;
    case 'Meta':
      value = event.metaKey || key == 'Meta';
      break;
    case 'Accel':
      value =
        event.metaKey || key == 'Meta' || event.ctrlKey || key == 'Control';
      break;
  }

  if (event.getModifierState !== undefined) {
    return value || event.getModifierState(modifierKey);
  }

  return value;
}

export class DefaultMap<K, V> extends Map<K, V> {
  constructor(
    private default_factory: (...args: any[]) => V,
    entries?: ReadonlyArray<readonly [K, V]> | null
  ) {
    super(entries);
  }

  get(k: K): V {
    return this.get_or_create(k);
  }

  get_or_create(k: K, ...args: any[]): V {
    if (this.has(k)) {
      return super.get(k);
    } else {
      let v = this.default_factory(k, ...args);
      this.set(k, v);
      return v;
    }
  }
}

export function server_root_uri() {
  return PageConfig.getOption('rootUri');
}

/**
 * compare two URIs, discounting:
 * - drive capitalization
 * - uri encoding
 * TODO: probably use vscode-uri
 */
export function uris_equal(a: string, b: string) {
  const win_paths = is_win_path(a) && is_win_path(b);
  if (win_paths) {
    a = normalize_win_path(a);
    b = normalize_win_path(b);
  }
  return a === b || decodeURI(a) === decodeURI(b);
}

/**
 * grossly detect whether a URI represents a file on a windows drive
 */
export function is_win_path(uri: string) {
  return uri.match(RE_PATH_ANCHOR);
}

/**
 * lowercase the drive component of a URI
 */
export function normalize_win_path(uri: string) {
  // Pyright encodes colon on Windows, see:
  // https://github.com/jupyter-lsp/jupyterlab-lsp/pull/587#issuecomment-844225253
  return uri.replace(RE_PATH_ANCHOR, it =>
    it.replace('%3A', ':').toLowerCase()
  );
}

export function uri_to_contents_path(child: string, parent?: string) {
  parent = parent || server_root_uri();
  if (parent == null) {
    return null;
  }
  if (child.startsWith(parent)) {
    return decodeURI(child.replace(parent, ''));
  }
  return null;
}

/**
 * The docs for many language servers show settings in the
 * VSCode format, e.g.: "pyls.plugins.pyflakes.enabled"
 *
 * VSCode converts that dot notation to JSON behind the scenes,
 * as the language servers themselves don't accept that syntax.
 */
export const expandPath = (
  path: string[],
  value: ReadonlyJSONValue
): ReadonlyJSONObject => {
  const obj: any = {};

  let curr = obj;
  path.forEach((prop: string, i: any) => {
    curr[prop] = {};

    if (i === path.length - 1) {
      curr[prop] = value;
    } else {
      curr = curr[prop];
    }
  });

  return obj;
};

export const expandDottedPaths = (
  obj: ReadonlyJSONObject
): ReadonlyJSONObject => {
  const settings: any = [];
  for (let key in obj) {
    const parsed = expandPath(key.split('.'), obj[key]);
    settings.push(parsed);
  }
  return mergeWith({}, ...settings);
};

export function escapeMarkdown(text: string) {
  // note: keeping backticks for highlighting of code sections
  text = text.replace(/([\\#*_[\]])/g, '\\$1');
  // escape HTML
  const span = document.createElement('span');
  span.textContent = text;
  return span.innerHTML.replace(/\n/g, '<br>').replace(/ {2}/g, '\u00A0\u00A0');
}
