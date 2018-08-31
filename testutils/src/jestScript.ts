const fetchMod = ((window as any).fetch = require('node-fetch')); // tslint:disable-line
(window as any).Request = fetchMod.Request;
(window as any).Headers = fetchMod.Headers;

declare var jest: any;
jest.setTimeout(20000);
