/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { AASDocument } from 'aas-core';
import { Logger } from '../logging/logger.js';
import { AasxPackage } from '../packages/file-system/aasx-package.js';
import { AasxDirectory } from '../packages/file-system/aasx-directory.js';
import { AASResourceScan } from './aas-resource-scan.js';
import { PagedResult } from '../types/paged-result.js';

export class DirectoryScan extends AASResourceScan {
    private readonly map = new Map<string, AASDocument>();

    public constructor(
        private readonly logger: Logger,
        private readonly source: AasxDirectory,
    ) {
        super();
    }

    protected override open(): Promise<void> {
        this.map.clear();
        return this.source.openAsync();
    }

    protected override close(): Promise<void> {
        this.map.clear();
        return this.source.closeAsync();
    }

    protected override createDocument(id: string): Promise<AASDocument> {
        const document = this.map.get(id);
        return document ? Promise.resolve(document) : Promise.reject(new Error(`${id} not found.`));
    }

    protected override async nextEndpointPage(cursor: string | undefined): Promise<PagedResult<string>> {
        const result = await this.source.getFiles(cursor);
        const ids: string[] = [];
        for (const file of result.result) {
            try {
                const aasxPackage = new AasxPackage(this.logger, this.source, file);
                const document = await aasxPackage.createDocumentAsync();
                ids.push(document.id);
                this.map.set(document.id, document);
            } catch (error) {
                this.emit('error', error, this.source, file);
            }
        }

        return { result: ids, paging_metadata: {} };
    }
}
