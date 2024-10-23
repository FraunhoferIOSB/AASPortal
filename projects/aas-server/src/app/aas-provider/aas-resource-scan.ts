/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import EventEmitter from 'events';
import { AASDocument, AASEndpoint } from 'aas-core';
import { AASIndex } from '../aas-index/aas-index.js';
import { PagedResult } from '../types/paged-result.js';

/** Defines an automate to scan an AAS resource for Asset Administration Shells. */
export abstract class AASResourceScan extends EventEmitter {
    /**
     * Gets all documents of the current container.
     * @param index The AAS index.
     * @param endpoint The endpoint.
     * */
    public async scanAsync(index: AASIndex, endpoint: AASEndpoint): Promise<void> {
        try {
            await this.open();

            const map = new Map<string, { reference?: AASDocument; document?: AASDocument }>();
            let indexCursor: string | undefined;
            let endpointCursor: string | undefined;
            let a = true;
            let b = true;
            do {
                if (a) {
                    const result = await index.nextPage(endpoint.name, indexCursor);
                    for (const reference of result.result) {
                        let value = map.get(reference.id);
                        if (value === undefined) {
                            value = { reference };
                            map.set(reference.id, value);
                        } else if (value.reference === undefined) {
                            value.reference = reference;
                        }
                    }

                    indexCursor = result.paging_metadata.cursor;
                    if (indexCursor === undefined) {
                        a = false;
                    }
                }

                if (b) {
                    const result = await this.nextEndpointPage(endpointCursor);
                    for (const id of result.result) {
                        let value = map.get(id);
                        if (value === undefined) {
                            value = {};
                            map.set(id, value);
                        }

                        if (value.document === undefined) {
                            value.document = await this.createDocument(id);
                        }
                    }

                    endpointCursor = result.paging_metadata.cursor;
                    if (endpointCursor === undefined) {
                        b = false;
                    }
                }

                const keys: string[] = [];
                for (const value of map.values()) {
                    if (value.reference && value.document) {
                        keys.push(value.reference.id);
                        this.emit('compare', value.reference, value.document);
                    } else if (!a && value.document) {
                        keys.push(value.document.id);
                        this.emit('add', value.document);
                    } else if (!b && value.reference) {
                        keys.push(value.reference.id);
                        this.emit('remove', value.document);
                    }
                }

                keys.forEach(key => map.delete(key));
            } while (a || b);

            for (const value of map.values()) {
                if (value.reference && value.document) {
                    this.emit('compare', value.reference, value.document);
                } else if (!a && value.document) {
                    this.emit('add', value.document);
                } else if (!b && value.reference) {
                    this.emit('remove', value.document);
                }
            }
        } finally {
            await this.close();
        }
    }

    protected abstract open(): Promise<void>;

    protected abstract close(): Promise<void>;

    protected abstract createDocument(id: string): Promise<AASDocument>;

    protected abstract nextEndpointPage(cursor: string | undefined): Promise<PagedResult<string>>;
}
