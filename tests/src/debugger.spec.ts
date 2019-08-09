import { expect } from 'chai';

import { Debugger } from '../../lib/debugger';

class TestPanel extends Debugger {}

describe('Debugger', () => {
  let panel: TestPanel;

  beforeEach(() => {
    panel = new TestPanel({});
  });

  afterEach(() => {
    panel.dispose();
  });

  describe('#constructor()', () => {
    it('should create a new debugger panel', () => {
      expect(panel).to.be.an.instanceOf(Debugger);
    });
  });
});
