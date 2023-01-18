import { ClosableDialog } from '../../widgets/closable-dialog';

/**
 * Compile-time tests that ensure ClosableDialog types are strict enough to
 * catch usage errors. Because these tests only test compile-time behavior (e.g.
 * on `jlpm build`), we skip this suite at test runtime.
 */
describe.skip('ClosableDialog types', () => {
  it('should raise compile error if passed component without closeDialog', () => {
    type Props = Record<string, never>;
    const Component = (p: Props) => <div />;

    new ClosableDialog({
      // @ts-expect-error
      body: Component,
      props: {}
    });
  });

  it('should raise compile error if passed incomplete props', () => {
    type Props = {
      a: string;
      closeDialog: () => unknown;
    };
    const Component = (p: Props) => <div />;

    new ClosableDialog({
      body: Component,
      // @ts-expect-error
      props: {}
    });
  });
});
