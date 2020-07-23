import { DebuggerConfig } from '../src/config';

describe('DebuggerConfig', () => {
  const kernel = 'python';
  let config: DebuggerConfig;

  beforeEach(() => {
    config = new DebuggerConfig();
  });

  describe('#getCodeId', () => {
    it('should throw if the kernel does not have hash parameters', () => {
      config.setTmpFileParams({ prefix: 'foo', suffix: 'bar', kernel });
      expect(() => {
        config.getCodeId('i = 0', kernel);
      }).toThrow('has no hashing params');
    });

    it('should throw if the kernel does not have tmp file parameters', () => {
      config.setHashParams({ method: 'Murmur2', seed: 'bar', kernel });
      expect(() => {
        config.getCodeId('i = 0', kernel);
      }).toThrow('has no tmp file params');
    });
  });
});
