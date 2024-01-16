/******************************************************************************
 *
 * Copyright (c) 2019-2023 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { inject, injectable } from 'tsyringe';
import fs from 'fs';
import {
    Body,
    Delete,
    Get,
    OperationId,
    Path,
    Post,
    Put,
    Queries,
    Route,
    Security,
    Tags,
    UploadedFile,
    UploadedFiles,
} from 'tsoa';
import { AASDocument, aas } from 'common';

import { AASProvider } from '../aas-provider/aas-provider.js';
import { AuthService } from '../auth/auth-service.js';
import { Logger } from '../logging/logger.js';
import { decodeBase64Url } from '../convert.js';
import { AASController } from './aas-controller.js';
import { Variable } from '../variable.js';

@injectable()
@Route('/api/v1/containers')
@Tags('Containers')
export class ContainersController extends AASController {
    public constructor(
        @inject('Logger') logger: Logger,
        @inject(AuthService) auth: AuthService,
        @inject(Variable) variable: Variable,
        @inject(AASProvider) private readonly aasProvider: AASProvider,
    ) {
        super(logger, auth, variable);
    }

    /**
     * @summary Downloads an AASX package from the specified AAS container.
     * @param endpoint The endpoint name (Base64Url encoded).
     * @param id The AAS identifier (Base64Url encoded).
     * @returns A readable stream.
     */
    @Get('{endpoint}/packages/{id}')
    @Security('bearerAuth', ['guest'])
    @OperationId('getPackage')
    public async getPackage(@Path() endpoint: string, @Path() id: string): Promise<NodeJS.ReadableStream> {
        try {
            this.logger.start('getDocument');
            return await this.aasProvider.getPackageAsync(decodeBase64Url(endpoint), decodeBase64Url(id));
        } finally {
            this.logger.stop();
        }
    }

    /**
     * @summary Uploads one or more AASX packages to the specified AAS container.
     * @param endpoint The name of the destination endpoint (Base64Url encoded).
     * @param files The AAS package file.
     */
    @Post('{endpoint}/packages')
    @Security('bearerAuth', ['editor'])
    @OperationId('addPackages')
    public async addPackages(@Path() endpoint: string, @UploadedFiles() files: Express.Multer.File[]): Promise<void> {
        try {
            this.logger.start('addPackages');
            await this.aasProvider.addPackagesAsync(decodeBase64Url(endpoint), files);
        } finally {
            this.logger.stop();
        }
    }

    /**
     * @summary Deletes an AAS document from its AAS container.
     * @param endpoint The endpoint name (Base64Url encoded).
     * @param id The AAS identifier (Base64Url encoded).
     */
    @Delete('{endpoint}/packages/{id}')
    @Security('bearerAuth', ['editor'])
    @OperationId('deletePackage')
    public async deletePackage(@Path() endpoint: string, @Path() id: string): Promise<void> {
        try {
            this.logger.start('deletePackage');
            await this.aasProvider.deletePackageAsync(decodeBase64Url(endpoint), decodeBase64Url(id));
        } finally {
            this.logger.stop();
        }
    }

    /**
     * @summary Downloads an AAS document from the specified AAS container.
     * @param endpoint The endpoint name (Base64Url encoded).
     * @param id The AAS identifier (Base64Url encoded).
     * @returns The AAS document.
     */
    @Get('{endpoint}/documents/{id}')
    @Security('bearerAuth', ['guest'])
    @OperationId('getDocument')
    public async getDocument(@Path() endpoint: string, @Path() id: string): Promise<AASDocument> {
        try {
            this.logger.start('getDocument');
            return await this.aasProvider.getDocumentAsync(decodeBase64Url(id), decodeBase64Url(endpoint));
        } finally {
            this.logger.stop();
        }
    }

    /**
     * @summary Gets the content of the specified AAS document.
     * @param endpoint The endpoint name (Base64Url encoded).
     * @param id The AAS identifier (Base64Url encoded).
     * @returns The AAS environment or `undefined`.
     */
    @Get('{endpoint}/documents/{id}/content')
    @Security('bearerAuth', ['guest'])
    @OperationId('getDocumentContent')
    public async getDocumentContent(
        @Path() endpoint: string,
        @Path() id: string,
    ): Promise<aas.Environment | undefined> {
        try {
            this.logger.start('getDocumentContent');
            return await this.aasProvider.getContentAsync(decodeBase64Url(endpoint), decodeBase64Url(id));
        } finally {
            this.logger.stop();
        }
    }

    /**
     * @summary Gets the thumbnail of the specified AAS document.
     * @param endpoint The endpoint name (Base64Url encoded).
     * @param id The AAS identifier (Base64Url encoded).
     * @returns The thumbnail of the current AAS document.
     */
    @Get('{endpoint}/documents/{id}/thumbnail')
    @Security('bearerAuth', ['guest'])
    @OperationId('getDocumentThumbnail')
    public async getDocumentThumbnail(
        @Path() endpoint: string,
        @Path() id: string,
    ): Promise<NodeJS.ReadableStream | undefined> {
        try {
            this.logger.start('getDocumentThumbnail');
            return await this.aasProvider.getThumbnailAsync(decodeBase64Url(endpoint), decodeBase64Url(id));
        } finally {
            this.logger.stop();
        }
    }

    /**
     * @summary Downloads the value of DataElement.
     * @param endpoint The URL of the AAS container (Base64Url encoded).
     * @param id The document or AAS identifier (Base64Url encoded).
     * @param smId The Submodel identifier (Base64Url encoded).
     * @param path The idShort path to the DataElement.
     * @param width The image width.
     * @param height The image height.
     */
    @Get('{endpoint}/documents/{id}/submodels/{smId}/submodel-elements/{path}/value')
    @Security('bearerAuth', ['guest'])
    @Security('api_key')
    @OperationId('getDataElementValue')
    public async getDataElementValue(
        @Path() endpoint: string,
        @Path() id: string,
        @Path() smId: string,
        @Path() path: string,
        @Queries() queryParams: { width?: number; height?: number },
    ): Promise<NodeJS.ReadableStream> {
        try {
            this.logger.start('getDataElementValue');
            return await this.aasProvider.getDataElementValueAsync(
                decodeBase64Url(endpoint),
                decodeBase64Url(id),
                decodeBase64Url(smId),
                path,
                queryParams,
            );
        } finally {
            this.logger.stop();
        }
    }

    /**
     * @summary Updates the content of an AAS document.
     * @param endpoint The URL of the AAS container (Base64Url encoded).
     * @param id The document or AAS identifier (Base64Url encoded).
     * @param content The new document content.
     * @returns The messages of the update process.
     */
    @Put('{endpoint}/documents/{id}')
    @Security('bearerAuth', ['editor'])
    @OperationId('updateDocument')
    public async updateDocument(
        @Path() endpoint: string,
        @Path() id: string,
        @UploadedFile() content: Express.Multer.File,
    ): Promise<string[]> {
        try {
            this.logger.start('updateDocument');
            const buffer = await fs.promises.readFile(content.path);
            const env: aas.Environment = JSON.parse(buffer.toString());
            return await this.aasProvider.updateDocumentAsync(decodeBase64Url(endpoint), decodeBase64Url(id), env);
        } finally {
            this.logger.stop();
        }
    }

    /**
     * @summary Invokes an Operation synchronously.
     * @param endpoint The URL of the AAS container (Base64Url encoded).
     * @param id The document or AAS identifier (Base64Url encoded).
     * @param operation The `Operation`.
     * @returns The executed `Operation`.
     */
    @Post('{endpoint}/documents/{id}/invoke')
    @Security('bearerAuth', ['editor'])
    @OperationId('invokeOperation')
    public async invokeOperation(
        @Path() endpoint: string,
        @Path() id: string,
        @Body() operation: aas.Operation,
    ): Promise<aas.Operation> {
        try {
            this.logger.start('invokeOperation');
            return await this.aasProvider.invoke(decodeBase64Url(endpoint), decodeBase64Url(id), operation);
        } finally {
            this.logger.stop();
        }
    }

    /**
     * @summary Gets the content of the specified AAS document.
     * @param endpoint The endpoint name (Base64Url encoded).
     * @param id The AAS identifier (Base64Url encoded).
     * @returns The AAS environment or `undefined`.
     */
    @Get('{endpoint}/documents/{id}/hierarchy')
    @Security('bearerAuth', ['guest'])
    @OperationId('getHierarchy')
    public async getHierarchy(@Path() endpoint: string, @Path() id: string): Promise<AASDocument[]> {
        try {
            this.logger.start('getHierarchy');
            return await this.aasProvider.getHierarchyAsync(decodeBase64Url(endpoint), decodeBase64Url(id));
        } finally {
            this.logger.stop();
        }
    }
}
