import { expect } from 'chai';

import { DebugService } from '../../lib/service';

describe('DebugService', () => {
  let service = new DebugService();

  describe('#constructor()', () => {
    it('should create a new instance', () => {
      expect(service).to.be.an.instanceOf(DebugService);
    });
  });
});
