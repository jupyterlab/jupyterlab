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
  private _initialQuery: string = 'unset';

  constructor(widget: Widget) {
    super(widget);
    this._queryReceived = new PromiseDelegate();
  }
  get queryReceived(): Promise<RegExp | null> {
    return this._queryReceived.promise;
  }

  async startQuery(query: RegExp | null, filters = {}): Promise<void> {
    this._queryReceived.resolve(query);
    this._queryReceived = new PromiseDelegate();
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
    });

    describe('#parsingError', () => {
      it('should set informative string message on invalid regex', async () => {
        model.useRegex = true;
        expect(model.parsingError).toEqual('');
        model.searchExpression = 'query\\';
        await signalToPromise(model.stateChanged);
        expect(model.parsingError).toEqual(
          'SyntaxError: Invalid regular expression: /query\\/: \\ at end of pattern'
        );
      });
    });

    describe('#suggestedInitialQuery', () => {
      it('should return inital query from provider', () => {
        expect(model.suggestedInitialQuery).toEqual('unset');
        provider.initialQuery = 'provider-set-query';
        expect(model.suggestedInitialQuery).toEqual('provider-set-query');
      });
    });

    describe('#initialQuery', () => {
      it('should set/get inital non-empty query', () => {
        model.initialQuery = 'externally-set-query';
        expect(model.initialQuery).toEqual('externally-set-query');
      });
      it('should fallback to previous search expression on empty value in setter', () => {
        model.searchExpression = 'search-expression';
        model.initialQuery = '';
        expect(model.initialQuery).toEqual('search-expression');
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
  });
});
