import { ReactEventHandler } from 'react';

/**
 * Workaround for https://github.com/mui/material-ui/issues/35287.
 */
declare global {
  namespace React {
    interface DOMAttributes<T> {
      onResize?: ReactEventHandler<T> | undefined;
      onResizeCapture?: ReactEventHandler<T> | undefined;
    }
  }
}
