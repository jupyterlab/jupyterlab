function searchOverlay(query, caseInsensitive) {
  if (typeof query == 'string') {
    query = new RegExp(
      query.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&'),
      caseInsensitive ? 'gi' : 'g'
    );
  } else if (!query.global) {
    query = new RegExp(query.source, query.ignoreCase ? 'gi' : 'g');
  }

  return {
    token: stream => {
      query.lastIndex = stream.pos;
      const match = query.exec(stream.string);
      if (match && match.index === stream.pos) {
        stream.pos += match[0].length || 1;
        return 'searching';
      } else if (match) {
        stream.pos = match.index;
      } else {
        stream.skipToEnd();
      }
    }
  };
}

function SearchState() {
  this.posFrom = this.posTo = this.lastQuery = this.query = null;
  this.overlay = null;
}

function getSearchState(cm) {
  return cm.state.search || (cm.state.search = new SearchState());
}

function queryCaseInsensitive(query) {
  return typeof query === 'string' && query === query.toLowerCase();
}

function getSearchCursor(cm, query, pos) {
  // Heuristic: if the query string is all lowercase, do a case insensitive search.
  return cm.getSearchCursor(query, pos, {
    caseFold: queryCaseInsensitive(query),
    multiline: true
  });
}

function persistentDialog(cm, text, deflt, onEnter, onKeyDown) {
  cm.openDialog(text, onEnter, {
    value: deflt,
    selectValueOnOpen: true,
    closeOnEnter: false,
    onClose: () => {
      clearSearch(cm);
    },
    onKeyDown
  });
}

function parseString(string) {
  return string.replace(/\\(.)/g, (_, ch) => {
    if (ch === 'n') {
      return '\n';
    }
    if (ch === 'r') {
      return '\r';
    }
    return ch;
  });
}

function parseQuery(query) {
  const isRE = query.match(/^\/(.*)\/([a-z]*)$/);
  if (isRE) {
    try {
      query = new RegExp(isRE[1], isRE[2].indexOf('i') === -1 ? '' : 'i');
    } catch (e) {} // Not a regular expression after all, do a string search
  } else {
    query = parseString(query);
  }
  if (typeof query == 'string' ? query == '' : query.test('')) {
    query = /x^/;
  }
  return query;
}

function startSearch(cm, state, query) {
  state.queryText = query;
  state.query = parseQuery(query);
  cm.removeOverlay(state.overlay, queryCaseInsensitive(state.query));
  state.overlay = searchOverlay(state.query, queryCaseInsensitive(state.query));
  cm.addOverlay(state.overlay);
  if (cm.showMatchesOnScrollbar) {
    if (state.annotate) {
      state.annotate.clear();
      state.annotate = null;
    }
    state.annotate = cm.showMatchesOnScrollbar(
      state.query,
      queryCaseInsensitive(state.query)
    );
  }
}

function doSearch(cm, rev, persistent, immediate) {
  const state = getSearchState(cm);
  if (state.query) {
    return findNext(cm, rev);
  }
  const q = cm.getSelection() || state.lastQuery;
  if (q instanceof RegExp && q.source === 'x^') {
    q = null;
  }
  if (persistent && cm.openDialog) {
    let hiding = null;
    const searchNext = (query, event) => {
      CodeMirror.e_stop(event);
      if (!query) return;
      if (query != state.queryText) {
        startSearch(cm, state, query);
        state.posFrom = state.posTo = cm.getCursor();
      }
      if (hiding) {
        hiding.style.opacity = 1;
      }
      findNext(cm, event.shiftKey, (_, to) => {
        let dialog;
        if (
          to.line < 3 &&
          document.querySelector &&
          (dialog = cm.display.wrapper.querySelector('.CodeMirror-dialog')) &&
          dialog.getBoundingClientRect().bottom - 4 >
            cm.cursorCoords(to, 'window').top
        ) {
          (hiding = dialog).style.opacity = 0.4;
        }
      });
    };
    persistentDialog(cm, getQueryDialog(cm), q, searchNext, (event, query) => {
      const keyName = CodeMirror.keyName(event);
      let extra = cm.getOption('extraKeys'),
        cmd =
          (extra && extra[keyName]) ||
          CodeMirror.keyMap[cm.getOption('keyMap')][keyName];
      if (
        cmd === 'findNext' ||
        cmd === 'findPrev' ||
        cmd === 'findPersistentNext' ||
        cmd === 'findPersistentPrev'
      ) {
        CodeMirror.e_stop(event);
        startSearch(cm, getSearchState(cm), query);
        cm.execCommand(cmd);
      } else if (cmd === 'find' || cmd === 'findPersistent') {
        CodeMirror.e_stop(event);
        searchNext(query, event);
      }
    });
    if (immediate && q) {
      startSearch(cm, state, q);
      findNext(cm, rev);
    }
  } else {
    dialog(cm, getQueryDialog(cm), 'Search for:', q, query => {
      if (query && !state.query) {
        cm.operation(() => {
          startSearch(cm, state, query);
          state.posFrom = state.posTo = cm.getCursor();
          findNext(cm, rev);
        });
      }
    });
  }
}

function findNext(cm, rev, callback) {
  cm.operation(() => {
    const state = getSearchState(cm);
    const cursor = getSearchCursor(
      cm,
      state.query,
      rev ? state.posFrom : state.posTo
    );
    if (!cursor.find(rev)) {
      cursor = getSearchCursor(
        cm,
        state.query,
        rev ? CodeMirror.Pos(cm.lastLine()) : CodeMirror.Pos(cm.firstLine(), 0)
      );
      if (!cursor.find(rev)) {
        return;
      }
    }
    cm.setSelection(cursor.from(), cursor.to());
    cm.scrollIntoView({ from: cursor.from(), to: cursor.to() }, 20);
    state.posFrom = cursor.from();
    state.posTo = cursor.to();
    if (callback) {
      callback(cursor.from(), cursor.to());
    }
  });
}

function clearSearch(cm) {
  cm.operation(() => {
    const state = getSearchState(cm);
    state.lastQuery = state.query;
    if (!state.query) return;
    state.query = state.queryText = null;
    cm.removeOverlay(state.overlay);
    if (state.annotate) {
      state.annotate.clear();
      state.annotate = null;
    }
  });
}

function replaceAll(cm, query, text) {
  cm.operation(() => {
    for (const cursor = getSearchCursor(cm, query); cursor.findNext(); ) {
      if (typeof query !== 'string') {
        const match = cm.getRange(cursor.from(), cursor.to()).match(query);
        cursor.replace(text.replace(/\$(\d)/g, (_, i) => match[i]));
      } else {
        cursor.replace(text);
      }
    }
  });
}

function replace(cm, all) {
  if (cm.getOption('readOnly')) {
    return;
  }
  const query = cm.getSelection() || getSearchState(cm).lastQuery;
  const dialogText = `<span class="CodeMirror-search-label">${
    all ? cm.phrase('Replace all:') : cm.phrase('Replace:')
  }</span>`;
  dialog(
    cm,
    dialogText + getReplaceQueryDialog(cm),
    dialogText,
    query,
    query => {
      if (!query) return;
      query = parseQuery(query);
      dialog(
        cm,
        getReplacementQueryDialog(cm),
        cm.phrase('Replace with:'),
        '',
        text => {
          text = parseString(text);
          if (all) {
            replaceAll(cm, query, text);
          } else {
            clearSearch(cm);
            const cursor = getSearchCursor(cm, query, cm.getCursor('from'));
            const advance = () => {
              let start = cursor.from(),
                match;
              if (!(match = cursor.findNext())) {
                cursor = getSearchCursor(cm, query);
                if (
                  !(match = cursor.findNext()) ||
                  (start &&
                    cursor.from().line === start.line &&
                    cursor.from().ch === start.ch)
                ) {
                  return;
                }
              }
              cm.setSelection(cursor.from(), cursor.to());
              cm.scrollIntoView({ from: cursor.from(), to: cursor.to() });
              confirmDialog(
                cm,
                getDoReplaceConfirm(cm),
                cm.phrase('Replace?'),
                [
                  () => {
                    doReplace(match);
                  },
                  advance,
                  () => {
                    replaceAll(cm, query, text);
                  }
                ]
              );
            };
            const doReplace = match => {
              cursor.replace(
                typeof query === 'string'
                  ? text
                  : text.replace(/\$(\d)/g, (_, i) => match[i])
              );
              advance();
            };
            advance();
          }
        }
      );
    }
  );
}

CodeMirror.commands.find = function(cm) {
  clearSearch(cm);
  doSearch(cm);
};
CodeMirror.commands.findPersistent = function(cm) {
  clearSearch(cm);
  doSearch(cm, false, true);
};
CodeMirror.commands.findPersistentNext = function(cm) {
  doSearch(cm, false, true, true);
};
CodeMirror.commands.findPersistentPrev = function(cm) {
  doSearch(cm, true, true, true);
};
CodeMirror.commands.findNext = doSearch;
CodeMirror.commands.findPrev = function(cm) {
  doSearch(cm, true);
};
CodeMirror.commands.clearSearch = clearSearch;
CodeMirror.commands.replace = replace;
CodeMirror.commands.replaceAll = function(cm) {
  replace(cm, true);
};
