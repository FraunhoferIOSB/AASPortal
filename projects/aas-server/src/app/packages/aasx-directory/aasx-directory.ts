/******************************************************************************
 *
 * Copyright (c) 2019-2023 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { aas, ApplicationError, LiveRequest } from 'common';
import { readFile } from 'fs/promises';
import { ERRORS } from '../../errors.js';
import { FileStorage } from '../../file-storage/file-storage.js';
import { Logger } from '../../logging/logger.js';
import { SocketClient } from '../../live/socket-client.js';
import { AASPackage } from '../aas-package.js';
import { AASResource } from '../aas-resource.js';
import { AasxPackage } from './aasx-package.js';
import { SocketSubscription } from '../../live/socket-subscription.js';

export class AasxDirectory extends AASResource {
    private reentry = 0;

    constructor(logger: Logger, url: string | URL, private readonly fileStorage: FileStorage) {
        super(logger, url);
    }

    public get isOpen(): boolean {
        return this.reentry > 0;
    }

    public readonly readOnly = true;

    public readonly onlineReady = false;

    public getStorage(): FileStorage {
        return this.fileStorage;
    }

    public async testAsync(): Promise<void> {
        if (this.reentry === 0) {
            try {
                await this.openAsync();
            } finally {
                await this.closeAsync();
            }
        }
    }

    public async openAsync(): Promise<void> {
        if (this.reentry === 0) {
            if (!(await this.fileStorage.exists('.'))) {
                throw new Error(`The directory '${this.baseUrl}' does not exist.`);
            }

            ++this.reentry;
        }
    }

    public closeAsync(): Promise<void> {
        return new Promise(resolve => {
            if (this.reentry > 0) {
                --this.reentry;
            }

            resolve();
        });
    }

    public createPackage(address: string): AASPackage {
        return new AasxPackage(this.logger, this, address);
    }

    public createSubscription(
        client: SocketClient,
        message: LiveRequest,
        env: aas.Environment): SocketSubscription {
        throw new Error('Not implemented.');
    }

    public async getPackageAsync(_: string, name: string): Promise<NodeJS.ReadableStream> {
        if (!(await this.fileStorage.exists(name))) {
            throw new Error(`The file '${name}' does not exist.`);
        }

        return this.fileStorage.createReadStream(name);
    }

    public async postPackageAsync(file: Express.Multer.File): Promise<AASPackage> {
        const exists = await this.fileStorage.exists(file.filename);
        if (exists) {
            throw new ApplicationError(
                `A file with the name '${file.filename}' already exists.`,
                ERRORS.FileAlreadyExists,
                file.filename);
        }

        try {
            const buffer = await readFile(file.path);
            await this.fileStorage.writeFile(file.filename, buffer);
            const aasPackage = new AasxPackage(this.logger, this, file.filename);
            return aasPackage;
        } catch (error) {
            if (await this.fileStorage.exists(file.filename)) {
                await this.fileStorage.unlink(file.filename);
            }

            throw error;
        }
    }

    public deletePackageAsync(_: string, name: string): Promise<void> {
        return this.fileStorage.unlink(name);
    }

    public invoke(env: aas.Environment, operation: aas.Operation): Promise<aas.Operation> {
        throw new Error('Not implemented.');
    }

    public getBlobValueAsync(env: aas.Environment, submodelId: string, idShortPath: string): Promise<string | undefined> {
        throw new Error('Not implemented.');
    }
}