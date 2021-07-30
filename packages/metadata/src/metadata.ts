/*
 * Copyright 2018-2021 Elyra Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { IDictionary } from './parsing';
import { RequestHandler } from './requests';

const ELYRA_SCHEMA_API_ENDPOINT = 'elyra/schema/';
const ELYRA_METADATA_API_ENDPOINT = 'elyra/metadata/';

/**
 * A service class for accessing the elyra api.
 */
export class MetadataService {
  /**
   * Service function for making GET calls to the elyra metadata API.
   *
   * @param namespace - the metadata namespace being accessed
   *
   * @returns a promise that resolves with the requested metadata or
   * an error dialog result
   */
  static async getMetadata(namespace: string): Promise<any> {
    return RequestHandler.makeGetRequest(
      ELYRA_METADATA_API_ENDPOINT + namespace
    ).then(metadataResponse => metadataResponse[namespace]);
  }

  /**
   * Service function for making POST calls to the elyra metadata API.
   *
   * @param namespace - the metadata namespace being accessed
   * @param requestBody - the body of the request
   *
   * @returns a promise that resolves with the newly created metadata or
   * an error dialog result
   */
  static async postMetadata(namespace: string, requestBody: any): Promise<any> {
    return RequestHandler.makePostRequest(
      ELYRA_METADATA_API_ENDPOINT + namespace,
      requestBody
    );
  }

  /**
   * Service function for making PUT calls to the elyra metadata API.
   *
   * @param namespace - the metadata namespace being accessed
   * @param name - the metadata name being updated
   * @param requestBody - the body of the request
   *
   * @returns a promise that resolves with the updated metadata or
   * an error dialog result
   */
  static async putMetadata(
    namespace: string,
    name: string,
    requestBody: any
  ): Promise<any> {
    return RequestHandler.makePutRequest(
      ELYRA_METADATA_API_ENDPOINT + namespace + '/' + name,
      requestBody
    );
  }

  /**
   * Service function for making DELETE calls to the elyra metadata API.
   *
   * @param namespace - the metadata namespace being accessed
   * @param name - the metadata name being updated
   *
   * @returns void or an error dialog result
   */
  static async deleteMetadata(namespace: string, name: string): Promise<any> {
    return RequestHandler.makeDeleteRequest(
      ELYRA_METADATA_API_ENDPOINT + namespace + '/' + name
    );
  }

  private static schemaCache: IDictionary<any> = {};

  /**
   * Service function for making GET calls to the elyra schema API.
   *
   * @param namespace - the schema namespace being requested
   *
   * @returns a promise that resolves with the requested schemas or
   * an error dialog result
   */
  static async getSchema(namespace: string): Promise<any> {
    if (this.schemaCache[namespace]) {
      // Deep copy cached schema to mimic request call
      return JSON.parse(JSON.stringify(this.schemaCache[namespace]));
    }

    return RequestHandler.makeGetRequest(
      ELYRA_SCHEMA_API_ENDPOINT + namespace
    ).then(schemaResponse => {
      if (schemaResponse[namespace]) {
        this.schemaCache[namespace] = schemaResponse[namespace];
      }

      return schemaResponse[namespace];
    });
  }

  /**
   * Service function for making GET calls to the elyra schema API.
   *
   * @returns a promise that resolves with the requested schemas or
   * an error dialog result
   */
  static async getAllSchema(): Promise<any> {
    try {
      const namespaces = await RequestHandler.makeGetRequest('elyra/namespace');
      const schemas = [];
      for (const namespace of namespaces['namespaces']) {
        const schema = await this.getSchema(namespace);
        schemas.push(...schema);
      }
      return schemas;
    } catch (error) {
      return Promise.reject(error);
    }
  }
}
