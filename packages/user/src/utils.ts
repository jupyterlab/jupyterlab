// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';

/**
 * Call the API extension
 *
 * @param endPoint API REST end point for the extension
 * @param init Initial values for the request
 * @returns The response body interpreted as JSON
 */
export async function requestAPI<T>(
  endPoint = '',
  init: RequestInit = {}
): Promise<T> {
  const settings = ServerConnection.makeSettings();
  const requestUrl = URLExt.join(settings.baseUrl, endPoint);

  let response: Response;
  try {
    response = await ServerConnection.makeRequest(requestUrl, init, settings);
  } catch (error) {
    throw new ServerConnection.NetworkError(error);
  }

  let data: any = await response.text();

  if (data.length > 0) {
    try {
      data = JSON.parse(data);
    } catch (error) {
      console.log('Not a JSON response body.', response);
    }
  }

  if (!response.ok) {
    throw new ServerConnection.ResponseError(response, data.message || data);
  }

  return data;
}

// From https://en.wikipedia.org/wiki/Moons_of_Jupiter
export const moonsOfJupyter = [
  'Metis',
  'Adrastea',
  'Amalthea',
  'Thebe',
  'Io',
  'Europa',
  'Ganymede',
  'Callisto',
  'Themisto',
  'Leda',
  'Ersa',
  'Pandia',
  'Himalia',
  'Lysithea',
  'Elara',
  'Dia',
  'Carpo',
  'Valetudo',
  'Euporie',
  'Eupheme',
  // 'S/2003 J 18',
  // 'S/2010 J 2',
  'Helike',
  // 'S/2003 J 16',
  // 'S/2003 J 2',
  'Euanthe',
  // 'S/2017 J 7',
  'Hermippe',
  'Praxidike',
  'Thyone',
  'Thelxinoe',
  // 'S/2017 J 3',
  'Ananke',
  'Mneme',
  // 'S/2016 J 1',
  'Orthosie',
  'Harpalyke',
  'Iocaste',
  // 'S/2017 J 9',
  // 'S/2003 J 12',
  // 'S/2003 J 4',
  'Erinome',
  'Aitne',
  'Herse',
  'Taygete',
  // 'S/2017 J 2',
  // 'S/2017 J 6',
  'Eukelade',
  'Carme',
  // 'S/2003 J 19',
  'Isonoe',
  // 'S/2003 J 10',
  'Autonoe',
  'Philophrosyne',
  'Cyllene',
  'Pasithee',
  // 'S/2010 J 1',
  'Pasiphae',
  'Sponde',
  // 'S/2017 J 8',
  'Eurydome',
  // 'S/2017 J 5',
  'Kalyke',
  'Hegemone',
  'Kale',
  'Kallichore',
  // 'S/2011 J 1',
  // 'S/2017 J 1',
  'Chaldene',
  'Arche',
  'Eirene',
  'Kore',
  // 'S/2011 J 2',
  // 'S/2003 J 9',
  'Megaclite',
  'Aoede',
  // 'S/2003 J 23',
  'Callirrhoe',
  'Sinope'
];

/**
 * Get a random user-name based on the moons of Jupyter.
 * This function returns names like "Anonymous Io" or "Anonymous Metis".
 */
export const getAnonymousUserName = (): string =>
  moonsOfJupyter[Math.floor(Math.random() * moonsOfJupyter.length)];

/**
 * Extract the initials from the name of the user.
 */
export const getInitials = (name: string, familyName?: string): string => {
  let initials = '';
  const tmpName = name.split(' ');
  const tmpFamilyName = familyName ? familyName.split(' ') : [];

  if (tmpName.length > 0) {
    initials += tmpName[0].substring(0, 1).toLocaleUpperCase();
  }
  if (tmpFamilyName.length > 0) {
    initials += tmpFamilyName[0].substring(0, 1).toLocaleUpperCase();
  } else if (tmpName.length > 1) {
    initials += tmpName[1].substring(0, 1).toLocaleUpperCase();
  }

  return initials;
};
