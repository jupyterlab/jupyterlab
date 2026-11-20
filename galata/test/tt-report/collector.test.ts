import { expect, test } from '@jupyterlab/galata';

test.use({ autoGoto: false, collectTrustedTypes: true });

test('Trusted Types collector is live', async ({
  page,
  trustedTypesViolations,
  baseURL
}) => {
  const response = await page.page.goto(`${baseURL}/lab`, {
    waitUntil: 'domcontentloaded'
  });
  expect(response?.headers()['content-security-policy-report-only']).toContain(
    "require-trusted-types-for 'script'"
  );
  await expect(
    page.getByRole('main').getByRole('tabpanel', { name: 'Launcher' })
  ).toBeVisible();

  // The pass-through policy was installed before the app started.
  expect(
    await page.evaluate(() =>
      Boolean((window as any).trustedTypes?.defaultPolicy)
    )
  ).toBe(true);

  // A deliberate violation must be recorded.
  await page.evaluate(() => {
    document.body.insertAdjacentHTML('beforeend', '<i id="tt-probe"></i>');
    document.getElementById('tt-probe')?.remove();
  });
  await expect
    .poll(() =>
      trustedTypesViolations.some(r =>
        String(r.sink).includes('insertAdjacentHTML')
      )
    )
    .toBe(true);
});
