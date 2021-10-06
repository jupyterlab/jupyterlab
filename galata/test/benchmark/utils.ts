import { Contents } from '@jupyterlab/services';
import { Page } from '@playwright/test';
import fetch, { RequestInit, Response } from 'node-fetch';

/**
 * Private page config data for the Jupyter application.
 */
let configData: { [key: string]: string } | null = null;

// Get config data
async function getConfigData(page: Page): Promise<{ [key: string]: string }> {
  if (configData) {
    return configData;
  }

  configData = Object.create(null);

  const el = await page.$('#jupyter-config-data');

  if (!el) {
    return {};
  }

  configData = JSON.parse((await el?.textContent()) ?? '{}');

  for (const key in configData) {
    // PageConfig expects strings
    if (typeof configData[key] !== 'string') {
      configData[key] = JSON.stringify(configData[key]);
    }
  }

  return configData!;
}

/**
 *
 * @param path
 * @param page
 * @param request
 * @returns
 */
export async function requestContentAPI(
  baseURL: string,
  path: string,
  page?: Page,
  request: RequestInit = { method: 'GET' }
): Promise<Response> {
  const baseUrl: string =
    (page && (await getConfigData(page)['baseUrl'])) || '/';
  const token: string = (page && (await getConfigData(page)['token'])) || '';

  const url = [baseURL + baseUrl, 'api/contents', path]
    .map(part => /^\/?(.*?)\/?$/.exec(part)[1])
    .join('/');

  if (token) {
    request.headers = { Authorization: `Token ${token}` };
  }

  return await fetch(url, request);
}

async function createADirectory(
  baseURL: string,
  dirPath: string,
  page?: Page
): Promise<boolean> {
  const body = JSON.stringify({
    format: 'json',
    type: 'directory'
  });

  let response = null;

  try {
    response = await requestContentAPI(baseURL, dirPath, page, {
      method: 'PUT',
      body
    });
  } catch (error) {
    console.error(`Failed to create directory ${dirPath}`, error);
  }

  return response?.status === 201;
}

/**
 * Return the model for a path.
 *
 * @param path Path
 * @param type Path type
 * @returns Element metadata
 */
async function getContentMetadata(
  baseURL: string,
  path: string,
  type: 'file' | 'directory' = 'file',
  page?: Page
): Promise<Contents.IModel | null> {
  const data = [
    ['type', type],
    [
      // Get the content only for directory
      'content',
      type === 'directory' ? '1' : '0'
    ]
  ];

  let response: Response | null = null;

  try {
    response = await requestContentAPI(
      baseURL,
      [path, new URLSearchParams(data).toString()].join('?'),
      page
    );
  } catch (error) {
    console.error(`Fail to get content metadata for ${path}`, error);
  }

  const succeeded = response?.status === 200;

  if (succeeded) {
    return response!.json();
  }

  return null;
}

/**
 * Whether a directory exists or not
 *
 * @param dirPath Directory path
 * @returns Directory existence status
 */
async function directoryExists(
  baseURL: string,
  dirPath: string,
  page?: Page
): Promise<boolean> {
  const content = await getContentMetadata(baseURL, dirPath, 'directory', page);

  return content?.type === 'directory';
}

/**
 * Whether a file exists or not
 *
 * @param filePath File path
 * @returns File existence status
 */
async function fileExists(
  baseURL: string,
  filePath: string,
  page?: Page
): Promise<boolean> {
  const content = await getContentMetadata(baseURL, filePath, 'file', page);

  return content?.type === 'notebook' || content?.type === 'file';
}

/**
 * Create a directory
 *
 * @param dirPath Directory path
 * @returns Action success status
 */
async function createDirectory(
  baseURL: string,
  dirPath: string,
  page?: Page
): Promise<boolean> {
  const directories = dirPath.split('/');
  let path = '';

  for (const directory of directories) {
    if (directory.trim() === '') {
      continue;
    }
    if (path !== '') {
      path += '/';
    }
    path += directory;
    await createADirectory(baseURL, path, page);
  }

  return true;
}

/**
 * Delete a file
 *
 * @param filePath File path
 * @returns Action success status
 */
async function deleteFile(
  baseURL: string,
  filePath: string,
  page?: Page
): Promise<boolean> {
  const fileName = filePath;

  let response: Response | null = null;

  try {
    response = await requestContentAPI(baseURL, fileName, page, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error(`Failed to delete file ${filePath}`, error);
  }

  const succeeded = response?.status === 204;

  if (succeeded) {
    return !(await fileExists(baseURL, fileName, page));
  }

  return false;
}

/**
 * Delete recursively a directory
 *
 * @param dirPath Directory path
 * @returns Action success status
 */
export async function deleteDirectory(
  baseURL: string,
  dirPath: string,
  page?: Page
): Promise<boolean> {
  const dirContent = await getContentMetadata(
    baseURL,
    dirPath,
    'directory',
    page
  );

  if (!(dirContent && dirContent.type === 'directory')) {
    return false;
  }

  let anyFailed = false;

  // delete directory contents first
  for (const item of dirContent.content) {
    if (item.type === 'directory') {
      if (!(await deleteDirectory(baseURL, item.path, page))) {
        anyFailed = true;
      }
    } else {
      if (!(await deleteFile(baseURL, item.path, page))) {
        anyFailed = true;
      }
    }
  }

  if (!(await deleteFile(baseURL, dirPath, page))) {
    anyFailed = true;
  }

  return !anyFailed;
}

/**
 * Upload content as file to JupyterLab.
 *
 * Note: the destinationPath is the filepath on the server.
 *
 * @param content Content file to upload
 * @param format Content format
 * @param destinationPath Destination filepath
 * @returns Whether the action succeeded or not.
 */

export async function uploadContent(
  baseURL: string,
  content: string,
  format: 'base64' | 'text' | 'json',
  destinationPath: string,
  page?: Page
): Promise<boolean> {
  const pos = destinationPath.lastIndexOf('/');
  if (pos !== -1) {
    const destDir = destinationPath?.substring(0, pos);
    if (destDir && !(await directoryExists(baseURL, destDir, page))) {
      await createDirectory(baseURL, destDir, page);
    }
  }

  const data = JSON.stringify({
    content,
    format,
    type: 'file'
  });

  let response: Response | null = null;

  try {
    response = await requestContentAPI(baseURL, destinationPath, page, {
      method: 'PUT',
      body: data
    });
  } catch (error) {
    console.error(
      `Failed to upload content to server ${destinationPath}`,
      error
    );
  }

  const succeeded = response?.status === 201;

  if (succeeded) {
    return await fileExists(baseURL, destinationPath, page);
  }

  return false;
}

export namespace Performance {
  /**
   * Clear all measures and place a mark
   *
   * @param name Mark
   */
  function startTimer(page: Page, name: string = 'start'): Promise<void> {
    return page.evaluate(`{
      performance.clearMeasures();
      performance.mark('${name}');
    }`);
  }

  /**
   * Get the duration since the mark has been created
   *
   * @param startMark Mark
   * @param name Measure
   * @returns Measure value
   */
  async function endTimer(
    page: Page,
    startMark: string = 'start',
    name: string = 'duration'
  ): Promise<number> {
    await page.evaluate(`performance.measure('${name}', '${startMark}')`);
    const time: number = await page.evaluate(
      `performance.getEntriesByName('${name}')[0].duration`
    );
    return time;
  }

  /**
   * Measure the time to execute a function using web browser performance API.
   *
   * @param fn Function to measure
   * @returns The duration to execute the function
   */
  export async function measure(
    page: Page,
    fn: () => Promise<void>,
    mark = 'duration'
  ): Promise<number> {
    await startTimer(page, mark);

    await fn();

    return endTimer(page, mark);
  }
}
