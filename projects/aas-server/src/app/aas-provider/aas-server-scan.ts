/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { AASDocument } from 'common';
import { Logger } from '../logging/logger.js';
import { AASApiClient } from '../packages/aas-server/aas-api-client.js';
import { AASServerPackage } from '../packages/aas-server/aas-server-package.js';
import { AASResourceScan } from './aas-resource-scan.js';

export class AASServerScan extends AASResourceScan {
    private readonly logger: Logger;
    private readonly server: AASApiClient;

    public constructor(logger: Logger, server: AASApiClient) {
        super();

        this.logger = logger;
        this.server = server;
    }

    public async scanAsync(): Promise<AASDocument[]> {
        try {
            await this.server.openAsync();
            const documents: AASDocument[] = [];
            const idShorts = await this.server.getShellsAsync();
            for (const idShort of idShorts) {
                try {
                    const aasPackage = new AASServerPackage(this.logger, this.server, idShort);
                    const document = await aasPackage.createDocumentAsync();
                    documents.push(document);
                    this.emit('scanned', document);
                } catch (error) {
                    this.emit('error', error, this.server, idShort);
                }
            }

            return documents;
        } finally {
            await this.server.closeAsync();
        }
    }
}