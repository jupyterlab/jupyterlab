// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import {
  GenericSearchProvider,
  SearchDocumentModel
} from '@jupyterlab/documentsearch';
import { Widget } from '@lumino/widgets';
import { PromiseDelegate } from '@lumino/coreutils';
import { signalToPromise } from '@jupyterlab/testing';

class LogSearchProvider extends GenericSearchProvider {
  private _queryReceived: PromiseDelegate<RegExp | null>;
  private _queryEnded: PromiseDelegate<void>;
  private _initialQuery: string = 'unset';

  constructor(widget: Widget) {
    super(widget);
    this._queryReceived = new PromiseDelegate();
    this._queryEnded = new PromiseDelegate();
  }
  get queryReceived(): Promise<RegExp | null> {
    return this._queryReceived.promise;
  }
  get queryEnded(): Promise<void> {
    return this._queryEnded.promise;
  }

  async startQuery(query: RegExp | null, filters = {}): Promise<void> {
    this._queryReceived.resolve(query);
    this._queryReceived = new PromiseDelegate();
  }

  async endQuery(): Promise<void> {
    this._queryEnded.resolve();
  }

  set initialQuery(query: string) {
    this._initialQuery = query;
  }

  getInitialQuery() {
    return this._initialQuery;
  }
}

describe('documentsearch/searchmodel', () => {
  describe('SearchDocumentModel', () => {
    let provider: LogSearchProvider;
    let widget: Widget;
    let model: SearchDocumentModel;

    beforeEach(() => {
      widget = new Widget();
      provider = new LogSearchProvider(widget);
      model = new SearchDocumentModel(provider, 0);
    });

    afterEach(async () => {
      widget.dispose();
    });

    describe('#searchExpression', () => {
      it('should notify provider of new query when set', async () => {
        model.searchExpression = 'query';
        expect(model.searchExpression).toEqual('query');
        const query = (await provider.queryReceived)!;
        expect(query.test('query')).toEqual(true);
        query.lastIndex = 0;
        expect(query.test('test')).toEqual(false);
        query.lastIndex = 0;
      });
      it('should end search when query is empty', async () => {
        // Start a search
        model.searchExpression = 'query';
        expect(model.searchExpression).toEqual('query');
        await provider.queryReceived;
        // Empty the query
        model.searchExpression = '';
        await provider.queryEnded;
        expect(model.searchExpression).toEqual('');
      });
    });

    describe('#parsingError', () => {
      it('should set informative string message on invalid regex', async () => {
        model.useRegex = true;
        expect(model.parsingError).toEqual('');
        model.searchExpression = 'query\\';
        await signalToPromise(model.stateChanged);
        expect([
          // Node 18.x and older
          'SyntaxError: Invalid regular expression: /query\\/: \\ at end of pattern',
          // Node 20.x and newer
          'SyntaxError: Invalid regular expression: /query\\/gim: \\ at end of pattern'
        ]).toContain(model.parsingError);
      });
    });

    describe('#suggestedInitialQuery', () => {
      it('should return initial query from provider', () => {
        expect(model.suggestedInitialQuery).toEqual('unset');
        provider.initialQuery = 'provider-set-query';
        expect(model.suggestedInitialQuery).toEqual('provider-set-query');
      });
    });

    describe('#initialQuery', () => {
      it('should set/get initial non-empty query', () => {
        model.initialQuery = 'externally-set-query';
        expect(model.initialQuery).toEqual('externally-set-query');
      });
      it('should remember last query', async () => {
        model.initialQuery = 'query';
        expect(model.initialQuery).toEqual('query');
        await model.endQuery();
        expect(model.initialQuery).toEqual('query');
      });
    });

    describe('#caseSensitive', () => {
      it('should start a case-sensitive query', async () => {
        model.searchExpression = 'query';
        model.caseSensitive = true;
        expect(model.caseSensitive).toEqual(true);
        let query = (await provider.queryReceived)!;
        expect(query.test('query')).toEqual(true);
        query.lastIndex = 0;
        expect(query.test('QUERY')).toEqual(false);
        query.lastIndex = 0;

        model.caseSensitive = false;
        expect(model.caseSensitive).toEqual(false);
        query = (await provider.queryReceived)!;
        expect(query.test('query')).toEqual(true);
        query.lastIndex = 0;
        expect(query.test('QUERY')).toEqual(true);
        query.lastIndex = 0;
      });
    });

    describe('#wholeWords', () => {
      it('should start a whole-words query', async () => {
        model.searchExpression = 'query';
        model.wholeWords = true;
        expect(model.wholeWords).toEqual(true);
        let query = (await provider.queryReceived)!;
        expect(query.test(' query ')).toEqual(true);
        query.lastIndex = 0;
        expect(query.test('XqueryX')).toEqual(false);
        query.lastIndex = 0;

        model.wholeWords = false;
        expect(model.wholeWords).toEqual(false);
        query = (await provider.queryReceived)!;
        expect(query.test(' query ')).toEqual(true);
        query.lastIndex = 0;
        expect(query.test('XqueryX')).toEqual(true);
        query.lastIndex = 0;
      });
    });

    describe('#replaceText', () => {
      it('defaults to empty string', () => {
        expect(model.replaceText).toEqual('');
      });

      it('changes after assignment with setter', () => {
        model.replaceText = 'test';
        expect(model.replaceText).toEqual('test');
      });

      it('emits `stateChanged` signal on assignment', () => {
        let emitted = false;
        model.stateChanged.connect(() => {
          emitted = true;
        });
        model.replaceText = 'test';
        expect(emitted).toEqual(true);
      });

      it('does not emit `stateChanged` signal if value has not changed', () => {
        let emitted = 0;
        model.stateChanged.connect(() => {
          emitted += 1;
        });
        model.replaceText = '1';
        model.replaceText = '1';
        expect(emitted).toEqual(1);
      });
    });
  });
});
