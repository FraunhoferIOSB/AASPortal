/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { inject, singleton } from 'tsyringe';
import { AASEndpoint, ApplicationError } from 'aas-core';
import { Logger } from '../logging/logger.js';
import { AASResource } from './aas-resource.js';
import { AasxDirectory } from './file-system/aasx-directory.js';
import { AASApiClientV0 } from './aas-server/aas-api-client-v0.js';
import { AASApiClientV3 } from './aas-server/aas-api-client-v3.js';
import { OpcuaClient } from './opcua/opcua-client.js';
import { ERRORS } from '../errors.js';
import { FileStorageProvider } from '../file-storage/file-storage-provider.js';

@singleton()
export class AASResourceFactory {
    public constructor(
        @inject('Logger') private readonly logger: Logger,
        @inject(FileStorageProvider) private readonly fileStorageProvider: FileStorageProvider,
    ) {}

    /**
     * Creates a concrete realization of an `AASSource`.
     * @param url The URL of the container.
     * @returns A new instance of .
     */
    public create(endpoint: AASEndpoint): AASResource {
        switch (endpoint.type) {
            case 'AAS_API':
                switch (endpoint.version) {
                    case 'v3':
                        return new AASApiClientV3(this.logger, endpoint.url, endpoint.name);
                    case 'v0':
                        return new AASApiClientV0(this.logger, endpoint.url, endpoint.name);
                    default:
                        throw new Error(`AASX server version ${endpoint.version} is not supported.`);
                }
            case 'OPC_UA':
                return new OpcuaClient(this.logger, endpoint.url, endpoint.name);
            case 'WebDAV':
            case 'FileSystem': {
                return new AasxDirectory(
                    this.logger,
                    this.fileStorageProvider.get(endpoint.url),
                    endpoint.url,
                    endpoint.name,
                );
            }
            default:
                throw new Error('Not implemented.');
        }
    }

    /**
     * Tests whether the specified URL is a valid and supported AAS resource.
     * @param logger The logger.
     * @param url The current URL.
     */
    public async testAsync(endpoint: AASEndpoint): Promise<void> {
        try {
            switch (endpoint.type) {
                case 'AAS_API':
                    switch (endpoint.version) {
                        case 'v3':
                            await new AASApiClientV3(this.logger, endpoint.url, endpoint.name).testAsync();
                            break;
                        case 'v0':
                            await new AASApiClientV0(this.logger, endpoint.url, endpoint.name).testAsync();
                            break;
                        default:
                            throw new Error(`AASX server version ${endpoint.version} is not supported.`);
                    }
                    break;
                case 'OPC_UA':
                    await new OpcuaClient(this.logger, endpoint.url, endpoint.name).testAsync();
                    break;
                case 'WebDAV':
                case 'FileSystem':
                    {
                        await new AasxDirectory(
                            this.logger,
                            this.fileStorageProvider.get(endpoint.url),
                            endpoint.url,
                            endpoint.name,
                        ).testAsync();
                    }
                    break;
                default:
                    throw new Error('Not implemented.');
            }
        } catch (error) {
            throw new ApplicationError(
                `"${endpoint.url}" addresses an invalid or not supported AAS resource.`,
                ERRORS.InvalidContainerUrl,
                endpoint.url,
            );
        }
    }
}
