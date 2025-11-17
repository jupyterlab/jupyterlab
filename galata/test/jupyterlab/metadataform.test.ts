// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as path from 'path';
import { Page } from '@playwright/test';
import {
  expect,
  galata,
  IJupyterLabPageFixture,
  test
} from '@jupyterlab/galata';
import { ObservableJSON } from '@jupyterlab/observables';

const nbFile = 'code_notebook.ipynb';
test.use({
  autoGoto: false,
  tmpPath: 'metadataform-test',
  waitForApplication: async ({ baseURL }, use, testInfo) => {
    const simpleWait = async (page: Page): Promise<void> => {
      await page.locator('#jupyterlab-splash').waitFor({ state: 'detached' });
    };
    void use(simpleWait);
  }
});

test.beforeAll(async ({ request, tmpPath }) => {
  const contents = galata.newContentsHelper(request);
  await contents.uploadFile(
    path.resolve(__dirname, `./notebooks/${nbFile}`),
    `${tmpPath}/${nbFile}`
  );
});

test.afterAll(async ({ request, tmpPath }) => {
  const contents = galata.newContentsHelper(request);
  await contents.deleteDirectory(tmpPath);
});

/**
 * Activate notebook tools side bar.
 */
async function activatePropertyInspector(page: IJupyterLabPageFixture) {
  if ((await page.locator('.jp-NotebookTools').count()) > 0) {
    if (await page.locator('.jp-NotebookTools').isVisible()) {
      return;
    }
  }

  const widgetButton = page.locator(
    ".lm-TabBar-tab[title='Property Inspector']"
  );
  const buttonPosition = await widgetButton.boundingBox();

  if (buttonPosition === null)
    throw new Error(
      'Cannot get the position of the property inspector button.'
    );

  await page.mouse.click(
    buttonPosition.x + buttonPosition.width / 2,
    buttonPosition.y + buttonPosition.height / 2
  );

  await expect(page.locator('.jp-NotebookTools')).toBeVisible();
}

/**
 * Expand the form (open notebook tools if necessary)
 */
async function openForm(
  page: IJupyterLabPageFixture,
  label = 'Extension metadata'
) {
  await activatePropertyInspector(page);

  const form = page.locator('.jp-NotebookTools .jp-Collapse', {
    hasText: label
  });
  if (form.locator('.jp-Collapse-contents.lm-mod-hidden')) {
    await form.click();
    await expect(
      form.locator('.jp-Collapse-contents.lm-mod-hidden')
    ).toHaveCount(0);
  }
  return form;
}

/**
 * Return the formGroup DOM element after expanding the form.
 */
async function getFormGroup(page: IJupyterLabPageFixture) {
  const form = await openForm(page);
  return {
    form: form,
    formGroup: form.locator(
      '.jp-Collapse-contents .jp-MetadataForm fieldset > .form-group'
    )
  };
}

/*
 * Get the cell metadata
 */
async function getCellMetadata(
  page: IJupyterLabPageFixture,
  cellNumber: number = 0
): Promise<ObservableJSON> {
  return await page.evaluate(cellNum => {
    let nb = window.jupyterapp.shell.currentWidget;
    return nb.model.cells.get(cellNum).metadata;
  }, cellNumber);
}

/*
 * Get the cell metadata
 */
async function getNotebookMetadata(
  page: IJupyterLabPageFixture
): Promise<ObservableJSON> {
  return await page.evaluate(() => {
    let nb = window.jupyterapp.shell.currentWidget;
    return nb.model.metadata;
  });
}

test.describe('Required metadata', () => {
  test.use({
    mockSettings: {
      '@jupyterlab/metadataform-extension:metadataforms': {
        metadataforms: [
          {
            id: 'Extension-metadata',
            label: 'Extension metadata',
            metadataSchema: {
              type: 'object',
              required: ['/basic-metadata'],
              properties: {
                '/basic-metadata': {
                  title: 'Basic metadata',
                  description: 'Basic metadata description',
                  type: 'string'
                }
              }
            }
          }
        ]
      }
    }
  });

  test('should display the form', async ({ page, baseURL, tmpPath }) => {
    // Open the Notebook.
    await page.goto(baseURL);
    await page.notebook.openByPath(`${tmpPath}/${nbFile}`);

    // Activate the property inspector.
    await activatePropertyInspector(page);

    // Retrieves the form from its header's text, it should be collapsed.
    const form = page.locator('.jp-NotebookTools .jp-Collapse', {
      hasText: 'Extension metadata'
    });
    expect(await form.screenshot()).toMatchSnapshot(
      'metadata-collapsed-form.png'
    );
    await expect(
      form.locator('.jp-Collapse-contents.lm-mod-hidden')
    ).toHaveCount(1);

    // Expand the form.
    await form.click();
    await expect(
      form.locator('.jp-Collapse-contents.lm-mod-hidden')
    ).toHaveCount(0);

    // Get the formGroup (form content).
    const formGroup = form.locator(
      '.jp-Collapse-contents .jp-MetadataForm fieldset > .form-group'
    );

    // There should be only one field in formGroup, with correct title and description.
    await expect(formGroup).toHaveCount(1);
    await expect(
      formGroup.locator('.jp-FormGroup-compactTitle > .jp-FormGroup-fieldLabel')
    ).toHaveText('Basic metadata');
    await expect(
      formGroup.locator(
        '.jp-FormGroup-compactTitle > .jp-FormGroup-description'
      )
    ).toHaveText('Basic metadata description');
  });

  test('should fill metadata and display errors', async ({
    page,
    baseURL,
    tmpPath
  }) => {
    // Open the Notebook.
    await page.goto(baseURL);
    await page.notebook.openByPath(`${tmpPath}/${nbFile}`);

    // Open and get the form DOM.
    const { form, formGroup } = await getFormGroup(page);

    // Error should be displayed as required field is empty.
    await expect(formGroup.locator('.validationErrors')).not.toBeEmpty();
    expect(await form.screenshot()).toMatchSnapshot(
      'metadata-required-missing.png'
    );

    // Relevant metadata should be empty.
    let cellMetadata = await getCellMetadata(page, 0);
    expect(cellMetadata['basic-metadata']).toBeUndefined();

    // Filling the form.
    await formGroup.locator('input').fill('abc');

    // Metadata should be filled, and error not displayed anymore.
    cellMetadata = await getCellMetadata(page, 0);
    expect(cellMetadata['basic-metadata']).toBe('abc');
    await expect(formGroup.locator('.validationErrors')).toBeEmpty();
    expect(await form.screenshot()).toMatchSnapshot(
      'metadata-required-filled.png'
    );
  });
});

test.describe('Nested metadata', () => {
  test.use({
    mockSettings: {
      '@jupyterlab/metadataform-extension:metadataforms': {
        metadataforms: [
          {
            id: 'Extension-metadata',
            label: 'Extension metadata',
            metadataSchema: {
              type: 'object',
              properties: {
                '/level1/nested': {
                  title: 'Nested metadata 1',
                  type: 'integer'
                },
                '/level1/level2/nested': {
                  title: 'Nested metadata 2',
                  type: 'integer'
                }
              }
            }
          }
        ]
      }
    }
  });

  test('should fill nested metadata and remove the all tree if empty value', async ({
    page,
    baseURL,
    tmpPath
  }) => {
    // Open the Notebook.
    await page.goto(baseURL);
    await page.notebook.openByPath(`${tmpPath}/${nbFile}`);

    // Open and get the form DOM.
    const { formGroup } = await getFormGroup(page);

    // Metadata should be empty.
    let cellMetadata = await getCellMetadata(page, 0);
    expect(cellMetadata['level1']).toBeUndefined();

    // Replace the default value by 0, should write in metadata.
    await formGroup.locator('input').last().fill('0');

    cellMetadata = await getCellMetadata(page, 0);
    expect(cellMetadata['level1']['level2']['nested']).toBe(0);

    // Empty the field, should remove the metadata tree.
    await formGroup.locator('input').last().fill('');
    cellMetadata = await getCellMetadata(page, 0);
    expect(cellMetadata['level1']).toBeUndefined();
  });

  test('should remove only the empty metadata', async ({
    page,
    baseURL,
    tmpPath
  }) => {
    // Open the Notebook.
    await page.goto(baseURL);
    await page.notebook.openByPath(`${tmpPath}/${nbFile}`);

    // Open and get the form DOM.
    const { formGroup } = await getFormGroup(page);

    // Metadata should be empty.
    let cellMetadata = await getCellMetadata(page, 0);
    expect(cellMetadata['level1']).toBeUndefined();

    // Set the first level nested metadata.
    await formGroup.locator('input').first().fill('1');
    cellMetadata = await getCellMetadata(page, 0);
    expect(cellMetadata['level1']['nested']).toBe(1);
    expect(cellMetadata['level1']['level2']).toBeUndefined();

    // Set the second level nested metadata.
    await formGroup.locator('input').last().fill('1');

    cellMetadata = await getCellMetadata(page, 0);
    expect(cellMetadata['level1']['level2']['nested']).toBe(1);

    // If the value of level2 is deleted, only the level2 metadata should be removed.
    await formGroup.locator('input').last().fill('');
    cellMetadata = await getCellMetadata(page, 0);
    expect(cellMetadata['level1']['nested']).toBe(1);
    expect(cellMetadata['level1']['level2']).toBeUndefined();
  });
});

test.describe('Default metadata without "showModified" flag', () => {
  test.use({
    mockSettings: {
      '@jupyterlab/metadataform-extension:metadataforms': {
        metadataforms: [
          {
            id: 'Extension-metadata',
            label: 'Extension metadata',
            metadataSchema: {
              type: 'object',
              properties: {
                '/default-written': {
                  title: 'Default written',
                  type: 'integer',
                  default: 1
                },
                '/default-not-written': {
                  title: 'Default not written',
                  type: 'integer',
                  default: 1
                }
              }
            },
            metadataOptions: {
              '/default-not-written': {
                writeDefault: false
              }
            }
          }
        ]
      }
    }
  });

  test('should not fill metadata with "writeDefault" flag to false', async ({
    page,
    baseURL,
    tmpPath
  }) => {
    // Open the Notebook.
    await page.goto(baseURL);
    await page.notebook.openByPath(`${tmpPath}/${nbFile}`);

    // Open and get the form DOM.
    const { formGroup } = await getFormGroup(page);

    // Metadata should contains written default value.
    let cellMetadata = await getCellMetadata(page, 0);
    expect(cellMetadata['default-written']).toBe(1);

    // Empty value should remove the metadata.
    await formGroup.locator('input').first().fill('');
    cellMetadata = await getCellMetadata(page, 0);
    expect(cellMetadata['default-written']).toBeUndefined();

    // Fill the first one with default should be written in metadata.
    await formGroup.locator('input').first().fill('1');
    cellMetadata = await getCellMetadata(page, 0);
    expect(cellMetadata['default-written']).toBe(1);

    // Fill the second one with non default value should write metadata.
    await formGroup.locator('input').last().fill('0');

    cellMetadata = await getCellMetadata(page, 0);
    expect(cellMetadata['default-not-written']).toBe(0);

    // Fill the second one with default value should remove the metadata.
    await formGroup.locator('input').last().fill('1');
    cellMetadata = await getCellMetadata(page, 0);
    expect(cellMetadata['default-not-written']).toBeUndefined();
  });

  test('should not display the modified field', async ({
    page,
    baseURL,
    tmpPath
  }) => {
    // Open the Notebook.
    await page.goto(baseURL);
    await page.notebook.openByPath(`${tmpPath}/${nbFile}`);

    // Open and get the form DOM.
    const { formGroup } = await getFormGroup(page);

    // Metadata should contains written default value.
    let cellMetadata = await getCellMetadata(page, 0);
    expect(cellMetadata['default-written']).toBe(1);

    // Fill the first one with default should be written in metadata.
    await formGroup.locator('input').first().fill('2');
    cellMetadata = await getCellMetadata(page, 0);
    expect(cellMetadata['default-written']).toBe(2);

    await expect(formGroup.locator('.jp-FormGroup-default')).toHaveCount(0);
  });
});

test.describe('Default metadata with "showModified" flag', () => {
  test.use({
    mockSettings: {
      '@jupyterlab/metadataform-extension:metadataforms': {
        metadataforms: [
          {
            id: 'Extension-metadata',
            label: 'Extension metadata',
            showModified: true,
            metadataSchema: {
              type: 'object',
              properties: {
                '/value-with-default': {
                  title: 'value with default',
                  type: 'integer',
                  default: 1
                }
              }
            }
          }
        ]
      }
    }
  });

  test('should display the modified field', async ({
    page,
    baseURL,
    tmpPath
  }) => {
    // Open the Notebook.
    await page.goto(baseURL);
    await page.notebook.openByPath(`${tmpPath}/${nbFile}`);

    // Open and get the form DOM.
    const { formGroup } = await getFormGroup(page);

    // Metadata should contains the default value.
    let cellMetadata = await getCellMetadata(page, 0);
    expect(cellMetadata['value-with-default']).toBe(1);

    // Fill the field with non default value should display that value is different from default.
    await formGroup.locator('input').first().fill('2');
    cellMetadata = await getCellMetadata(page, 0);
    expect(cellMetadata['value-with-default']).toBe(2);
    await expect(formGroup.locator('.jp-FormGroup-default')).toHaveCount(1);
    await expect(formGroup.locator('.jp-FormGroup-default')).toContainText('1');
  });
});

test.describe('Notebook level and cell type metadata', () => {
  test.use({
    mockSettings: {
      '@jupyterlab/metadataform-extension:metadataforms': {
        metadataforms: [
          {
            id: 'Extension-metadata',
            label: 'Extension metadata',
            metadataSchema: {
              type: 'object',
              properties: {
                '/cell-metadata': {
                  title: 'Cell metadata',
                  type: 'string'
                },
                '/nb-nested/nb-metadata': {
                  title: 'Notebook metadata',
                  type: 'string'
                }
              }
            },
            metadataOptions: {
              '/nb-nested/nb-metadata': {
                metadataLevel: 'notebook'
              },
              '/cell-metadata': {
                cellTypes: ['code']
              }
            }
          }
        ]
      }
    }
  });

  test('should manage cell and notebook metadata in the same form', async ({
    page,
    baseURL,
    tmpPath
  }) => {
    // Open the Notebook.
    await page.goto(baseURL);
    await page.notebook.openByPath(`${tmpPath}/${nbFile}`);

    // Open and get the form DOM
    const { form, formGroup } = await getFormGroup(page);

    // There should be 2 fields displayed.
    await expect(formGroup).toHaveCount(2);
    expect(await form.screenshot()).toMatchSnapshot('metadata-level.png');

    // Metadata should be empty.
    let cellMetadata = await getCellMetadata(page, 0);
    expect(cellMetadata['cell-metadata']).toBeUndefined();
    let nbMetadata = await getNotebookMetadata(page);
    expect(nbMetadata['nb-nested']).toBeUndefined();

    // Fill the first level nested metadata.
    await formGroup.locator('input').first().fill('Cell input');
    await formGroup.locator('input').last().fill('Notebook input');

    // Metadata should be filled at their correct level.
    cellMetadata = await getCellMetadata(page, 0);
    expect(cellMetadata['cell-metadata']).toBe('Cell input');
    expect(cellMetadata['nb-nested']).toBeUndefined();
    nbMetadata = await getNotebookMetadata(page);
    expect(nbMetadata['nb-nested']['nb-metadata']).toBe('Notebook input');
    expect(nbMetadata['cell-metadata']).toBeUndefined();
  });

  test('should not display field for non relevant cell type', async ({
    page,
    baseURL,
    tmpPath
  }) => {
    let form, formGroup;
    // Open the Notebook.
    await page.goto(baseURL);
    await page.notebook.openByPath(`${tmpPath}/${nbFile}`);

    // Close the sidebar to avoid clicking on the cell toolbar when expecting
    // clicking in the cell editor.
    await page.sidebar.close('left');

    // Create a Markdown cell and select it.
    await page.notebook.addCell('markdown', 'Markdown cell');
    await page.notebook.selectCells((await page.notebook.getCellCount()) - 1);
    ({ form, formGroup } = await getFormGroup(page));
    await expect(formGroup).toHaveCount(1);
    expect(await form.screenshot()).toMatchSnapshot(
      'metadata-wrong-cell-type.png'
    );

    // Create a raw cell and select it.
    await page.notebook.addCell('raw', 'Raw cell');
    await page.notebook.selectCells((await page.notebook.getCellCount()) - 1);
    ({ form, formGroup } = await getFormGroup(page));
    await expect(formGroup).toHaveCount(1);
    expect(await form.screenshot()).toMatchSnapshot(
      'metadata-wrong-cell-type.png'
    );

    // Select the code cell again to retrieve full form.
    await page.notebook.selectCells(0);
    ({ form, formGroup } = await getFormGroup(page));
    await expect(formGroup).toHaveCount(2);
    expect(await form.screenshot()).toMatchSnapshot(
      'metadata-correct-cell-type.png'
    );
  });
});

test.describe('Conditional metadata', () => {
  test.use({
    mockSettings: {
      '@jupyterlab/metadataform-extension:metadataforms': {
        metadataforms: [
          {
            id: 'Extension-metadata',
            label: 'Extension metadata',
            metadataSchema: {
              type: 'object',
              properties: {
                '/basic-metadata': {
                  title: 'Basic metadata',
                  type: 'string',
                  enum: ['not met', 'met']
                }
              },
              allOf: [
                {
                  if: {
                    properties: {
                      '/basic-metadata': {
                        const: 'met'
                      }
                    }
                  },
                  then: {
                    properties: {
                      '/conditional-field': {
                        title: 'conditional field',
                        type: 'string'
                      }
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    }
  });

  test('display conditional field', async ({ page, baseURL, tmpPath }) => {
    // Open the Notebook.
    await page.goto(baseURL);
    await page.notebook.openByPath(`${tmpPath}/${nbFile}`);

    // Open and get the form DOM
    const { form, formGroup } = await getFormGroup(page);

    // There should be 1 field displayed as condition is not met.
    await formGroup.locator('select').first().selectOption('not met');
    await expect(formGroup).toHaveCount(1);
    expect(await form.screenshot()).toMatchSnapshot(
      'metadata-condition-not-met.png'
    );

    // Met the condition, then the second field should be displayed too.
    await formGroup.locator('select').first().selectOption('met');
    await expect(formGroup).toHaveCount(2);
    expect(await form.screenshot()).toMatchSnapshot(
      'metadata-condition-met.png'
    );

    // If the condition is not met, only one field should be displayed.
    await formGroup.locator('select').first().selectOption('not met');
    await expect(formGroup).toHaveCount(1);
    expect(await form.screenshot()).toMatchSnapshot(
      'metadata-condition-not-met.png'
    );
  });
});

test.describe('UISchema', () => {
  test.use({
    mockSettings: {
      '@jupyterlab/metadataform-extension:metadataforms': {
        metadataforms: [
          {
            id: 'Extension-metadata',
            label: 'Extension metadata',
            metadataSchema: {
              type: 'object',
              properties: {
                '/metadata1': {
                  type: 'string'
                },
                '/metadata2': {
                  title: 'Metadata 2',
                  type: 'integer'
                }
              }
            },
            uiSchema: {
              'ui:order': ['/metadata2', '/metadata1'],
              '/metadata1': {
                'ui:title': 'Metadata 1 title'
              }
            }
          }
        ]
      }
    }
  });

  test('should respect the order of the fields', async ({
    page,
    baseURL,
    tmpPath
  }) => {
    // Open the Notebook.
    await page.goto(baseURL);
    await page.notebook.openByPath(`${tmpPath}/${nbFile}`);

    // Open and get the form DOM.
    const { form, formGroup } = await getFormGroup(page);

    // The order of the fields should be respected.
    expect(await form.screenshot()).toMatchSnapshot('metadata-ui-schema.png');

    await expect(
      formGroup
        .locator('.jp-FormGroup-compactTitle > .jp-FormGroup-fieldLabel')
        .first()
    ).toHaveText('Metadata 2');
    await expect(formGroup.locator('input').first()).toHaveAttribute(
      'type',
      'number'
    );

    // Should display the title and description from uiSchema.
    await expect(
      formGroup
        .locator('.jp-FormGroup-compactTitle > .jp-FormGroup-fieldLabel')
        .last()
    ).toHaveText('Metadata 1 title');
    await expect(formGroup.locator('input').last()).toHaveAttribute(
      'type',
      'text'
    );
  });
});

test.describe('Advanced tools', () => {
  test('should remove a field from cellMedata and verify it is updated', async ({
    page,
    baseURL,
    tmpPath
  }) => {
    // Open the Notebook.
    await page.goto(baseURL);
    await page.notebook.openByPath(`${tmpPath}/${nbFile}`);

    // Activate the property inspector.
    await activatePropertyInspector(page);

    // Retrieves the form from its header's text, it should be collapsed.
    const form = page.locator('.jp-NotebookTools .jp-Collapse', {
      hasText: 'Advanced Tools'
    });
    await form.click();
    const cellMetadataEditor = page.locator(
      '.jp-CellMetadataEditor .cm-content'
    );

    // Modifying the cell metadata - removing the "trusted": "true" line
    const trustedLine = cellMetadataEditor.locator('.cm-line').filter({
      has: page.locator('span', { hasText: 'trusted' })
    });
    await trustedLine.evaluate(element => {
      element.remove();
    });
    await page
      .locator(
        '.jp-CellMetadataEditor .jp-JSONEditor-header [title="Commit changes to data"]'
      )
      .click();

    // Close the sidebar
    await page.locator('[title="Property Inspector"]').click();
    // Reopen the sidebar
    await activatePropertyInspector(page);

    // Verify the updaetd cellMetadata
    const cmLinesAfter = cellMetadataEditor.locator('.cm-line');
    await expect(cmLinesAfter).toHaveCount(1);
    await expect(cellMetadataEditor).toContainText('{}');
  });
});
