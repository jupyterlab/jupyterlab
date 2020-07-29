import * as playwright from 'playwright';

type NotebookType = {
  label: string;
  /**
   * Function that should return when the notebook, with this widgetID
   * is "ready". Waits for this before stopping the timing function.
   */
  waitFor: (options: {
    widgetID: string;
    page: playwright.Page;
  }) => Promise<void | null>;
  /**
   * Function that takes the n and returns the notebook object that will
   * serialized to JSON and saved.
   */
  notebook: (n: number) => object;
};

// eslint-disable-next-line no-undef
export default NotebookType;
