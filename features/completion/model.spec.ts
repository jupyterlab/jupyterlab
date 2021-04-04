import { expect } from 'chai';
import * as lsProtocol from 'vscode-languageserver-types';

import { LazyCompletionItem } from './item';
import { LSPCompleterModel } from './model';

describe('LSPCompleterModel', () => {
  let model: LSPCompleterModel;

  function create_dummy_item(
    match: lsProtocol.CompletionItem,
    type: string = 'dummy'
  ) {
    return new LazyCompletionItem(type, null, match, null, null);
  }

  const jupyter_icon_completion = create_dummy_item({
    label: '<i class="jp-icon-jupyter"></i> Jupyter',
    filterText: 'i font icon jupyter Jupyter',
    documentation: 'A Jupyter icon implemented with <i> tag'
  });
  const test_a_completion = create_dummy_item({
    label: 'test',
    sortText: 'a'
  });
  const test_b_completion = create_dummy_item({
    label: 'test',
    sortText: 'b'
  });
  const test_c_completion = create_dummy_item({
    label: 'test',
    sortText: 'c'
  });
  const test_test_completion = create_dummy_item({
    label: 'test_test',
    sortText: 'test_test'
  });

  beforeEach(() => {
    model = new LSPCompleterModel({
      caseSensitive: true,
      includePerfectMatches: true
    });
  });

  it('returns escaped when no query', () => {
    model.setCompletionItems([jupyter_icon_completion]);
    model.query = '';

    let markedItems = model.completionItems();
    expect(markedItems[0].label).to.be.equal(
      '&lt;i class="jp-icon-jupyter"&gt;&lt;/i&gt; Jupyter'
    );
  });

  it('marks html correctly', () => {
    model.setCompletionItems([jupyter_icon_completion]);
    model.query = 'Jup';

    let markedItems = model.completionItems();
    expect(markedItems[0].label).to.be.equal(
      '&lt;i class="jp-icon-jupyter"&gt;&lt;/i&gt; <mark>Jup</mark>yter'
    );
  });

  it('ties are solved with sortText', () => {
    model.setCompletionItems([
      test_a_completion,
      test_c_completion,
      test_b_completion
    ]);
    model.query = 'test';
    let sortedItems = model.completionItems();
    expect(sortedItems.map(item => item.sortText)).to.deep.equal([
      'a',
      'b',
      'c'
    ]);
  });

  it('ignores perfect matches when asked', () => {
    model = new LSPCompleterModel({
      includePerfectMatches: false
    });

    model.setCompletionItems([test_a_completion, test_test_completion]);
    model.query = 'test';
    let items = model.completionItems();
    // should not include the perfect match 'test'
    expect(items.length).to.equal(1);
    expect(items.map(item => item.sortText)).to.deep.equal(['test_test']);
  });

  it('case-sensitivity can be changed', () => {
    model = new LSPCompleterModel();
    model.setCompletionItems([test_a_completion]);
    model.query = 'Test';

    model.settings.caseSensitive = true;
    let items = model.completionItems();
    expect(items.length).to.equal(0);

    model.settings.caseSensitive = false;
    items = model.completionItems();
    expect(items.length).to.equal(1);
  });

  it('filters use filterText', () => {
    model.setCompletionItems([jupyter_icon_completion]);
    // font is in filterText but not in label
    model.query = 'font';

    let filteredItems = model.completionItems();
    expect(filteredItems.length).to.equal(1);

    // class is in label but not in filterText
    model.query = 'class';
    filteredItems = model.completionItems();
    expect(filteredItems.length).to.equal(0);
  });

  it('marks appropriate part of label when filterText matches', () => {
    model.setCompletionItems([jupyter_icon_completion]);
    // font is in filterText but not in label
    model.query = 'font';

    // nothing should get highlighted
    let markedItems = model.completionItems();
    expect(markedItems[0].label).to.be.equal(
      '&lt;i class="jp-icon-jupyter"&gt;&lt;/i&gt; Jupyter'
    );

    // i is in both label and filterText
    model.query = 'i';
    markedItems = model.completionItems();
    expect(markedItems[0].label).to.be.equal(
      '&lt;<mark>i</mark> class="jp-icon-jupyter"&gt;&lt;/i&gt; Jupyter'
    );
  });
});
