/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { inject, singleton } from 'tsyringe';
import { AASEndpoint } from 'common';
import { AASResourceScan } from './aas-resource-scan.js';
import { Logger } from '../logging/logger.js';
import { DirectoryScan } from './directory-scan.js';
import { AASXServerScan } from './aasx-server-scan.js';
import { OpcuaServerScan } from './opcua-server-scan.js';
import { OpcuaServer } from '../packages/opcua/opcua-server.js';
import { AasxDirectory } from '../packages/aasx-directory/aasx-directory.js';
import { AasxServer } from '../packages/aasx-server/aasx-server.js';
import { AasxServerV3 } from '../packages/aasx-server/aasx-server-v3.js';
import { AasxServerV0 } from '../packages/aasx-server/aasx-server-v0.js';
import { FileStorageProvider } from '../file-storage/file-storage-provider.js';
import { FileStorage } from '../file-storage/file-storage.js';

@singleton()
export class AASResourceScanFactory {
    public constructor(
        @inject('Logger') private readonly logger: Logger,
        @inject(FileStorageProvider) private readonly fileStorageProvider: FileStorageProvider,
    ) {}

    public create(endpoint: AASEndpoint): AASResourceScan {
        switch (new URL(endpoint.url).protocol) {
            case 'http:':
            case 'https': {
                const version = endpoint.version ?? '3.0';
                let source: AasxServer;
                if (version === '3.0') {
                    source = new AasxServerV3(this.logger, endpoint.url, endpoint.name);
                } else if (version === '0.0') {
                    source = new AasxServerV0(this.logger, endpoint.url, endpoint.name);
                } else {
                    throw new Error('Not implemented.');
                }

                return new AASXServerScan(this.logger, source);
            }
            case 'opc.tcp:':
                return new OpcuaServerScan(this.logger, new OpcuaServer(this.logger, endpoint.url, endpoint.name));
            case 'file:':
                return new DirectoryScan(
                    this.logger,
                    new AasxDirectory(
                        this.logger,
                        endpoint.url,
                        endpoint.name,
                        this.getFileStorage(new URL(endpoint.url)),
                    ),
                );
            default:
                throw new Error('Not implemented.');
        }
    }

    private getFileStorage(url: URL): FileStorage {
        return this.fileStorageProvider.get(url);
    }
}