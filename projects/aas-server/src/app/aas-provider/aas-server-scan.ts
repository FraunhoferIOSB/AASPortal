/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { AASDocument } from 'aas-core';
import { Logger } from '../logging/logger.js';
import { AASApiClient } from '../packages/aas-server/aas-api-client.js';
import { AASServerPackage } from '../packages/aas-server/aas-server-package.js';
import { AASResourceScan } from './aas-resource-scan.js';
import { PagedResult } from '../types/paged-result.js';

export class AASServerScan extends AASResourceScan {
    private readonly logger: Logger;
    private readonly server: AASApiClient;

    public constructor(logger: Logger, server: AASApiClient) {
        super();

        this.logger = logger;
        this.server = server;
    }

    protected override open(): Promise<void> {
        return this.server.openAsync();
    }
    protected override close(): Promise<void> {
        return this.server.closeAsync();
    }

    protected override createDocument(id: string): Promise<AASDocument> {
        const aasPackage = new AASServerPackage(this.logger, this.server, id);
        return aasPackage.createDocumentAsync();
    }

    protected override nextEndpointPage(cursor: string | undefined): Promise<PagedResult<string>> {
        return this.server.getShellsAsync(cursor);
    }
}
