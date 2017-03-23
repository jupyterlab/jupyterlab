

import './test.css';

(require as any).ensure('url', () => {
  let url = (require as any)('url');
  url.parse('');
});
