/******************************************************************************
 *
 * Copyright (c) 2019-2026 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import 'reflect-metadata';
import { beforeEach, describe, expect, it, Mocked } from 'vitest';
import { resolve } from 'path';

import { Variable } from './variable.js';
import { SubmodelRepository } from './submodel-repository.js';
import { createDatabase, createSpyObj } from '../test/mocks.js';
import { fileURLToPath } from 'url';
import { container } from 'tsyringe';
import { Database } from './db/database.js';
import { Runtime } from './runtime.js';

describe('SubmodelRepository', () => {
    let variable: Mocked<Variable>;
    let repository: SubmodelRepository;

    beforeEach(async () => {
        variable = createSpyObj<Variable>(
            {},
            { DATA: resolve('./src/test/assets/tmp/data'), PAGE_SIZE: 100, CACHE_SIZE: 100 },
        );

        container.clearInstances();
        container.registerInstance(Variable, variable);
        container.registerInstance(Runtime, createSpyObj<Runtime>({}));
        container.registerInstance(Database, await createDatabase());
        repository = container.resolve(SubmodelRepository);
    });

    describe('getSubmodels', () => {
        it('gets all submodels', async () => {
            const result = await repository.getSubmodels(undefined, undefined, 'deep', 'withoutBlobValue');
            expect(result.result.length).toBe(4);
        });
    });

    describe('getSubmodel', () => {
        it('gets a submodel', async () => {
            const submodel = await repository.getSubmodel(
                'http.//i40.customer.com/type/1/1/7A7104BDAB57E184',
                'deep',
                'withoutBlobValue',
            );

            expect(submodel?.id).toEqual('http.//i40.customer.com/type/1/1/7A7104BDAB57E184');
        });

        it('throws an Error (unknown Submodel)', async () => {
            await expect(repository.getSubmodel('unknown', 'deep', 'withoutBlobValue')).rejects.toThrow();
        });
    });

    describe('getFileByPath', () => {
        it('download the file content', async () => {
            const result = await repository.getFileByPath(
                'http://i40.customer.com/type/1/1/1A7B62B529F19152',
                'OperatingManual.DigitalFile_PDF',
            );

            expect(result.readable).toBeDefined();
        });

        it('throws an Error', async () => {
            await expect(repository.getFileByPath('unknown', 'OperatingManual.DigitalFile_PDF')).rejects.toThrow();
        });
    });

    describe('putFileByPath', () => {
        it('updates a File content', async () => {
            await expect(
                repository.putFileByPath(
                    'http://i40.customer.com/type/1/1/1A7B62B529F19152',
                    'OperatingManual.DigitalFile_PDF',
                    fileURLToPath(new URL('../test/assets/Test.pdf', import.meta.url)),
                    'Test.pdf',
                ),
            ).resolves.toBe(void 0);
        });

        it('throws an Error (unknown Submodel)', async () => {
            await expect(
                repository.putFileByPath(
                    'unknown',
                    'OperatingManual.DigitalFile_PDF',
                    resolve('./src/test/assets/Test.pdf'),
                    'Test.pdf',
                ),
            ).rejects.toThrow();
        });

        it('throws an Error (unknown File)', async () => {
            await expect(
                repository.putFileByPath(
                    'http://i40.customer.com/type/1/1/1A7B62B529F19152',
                    'OperatingManual.unknown',
                    resolve('./src/test/assets/Test.pdf'),
                    'Test.pdf',
                ),
            ).rejects.toThrow();
        });
    });

    describe('deleteFileByPath', () => {
        it('deletes a File content', async () => {
            await expect(
                repository.deleteFileByPath(
                    'http://i40.customer.com/type/1/1/1A7B62B529F19152',
                    'OperatingManual.DigitalFile_PDF',
                ),
            ).resolves.toBe(void 0);
        });

        it('throws an Error', async () => {
            await expect(repository.deleteFileByPath('unknown', 'OperatingManual.DigitalFile_PDF')).rejects.toThrow();
        });
    });

    describe('getSubmodelElement', () => {
        it('gets a Submodel Element', async () => {
            const property = await repository.getSubmodelElement(
                'http.//i40.customer.com/type/1/1/7A7104BDAB57E184',
                'MaxRotationSpeed',
                'deep',
                'withoutBlobValue',
            );

            expect(property.modelType).toEqual('Property');
        });

        it('throws an Error (invalid idShortPath)', async () => {
            await expect(
                repository.getSubmodelElement(
                    'http.//i40.customer.com/type/1/1/7A7104BDAB57E184',
                    'unknown',
                    'deep',
                    'withoutBlobValue',
                ),
            ).rejects.toThrow();
        });
    });

    describe('getSubmodelElementValue', () => {
        it('gets a Submodel Element value', async () => {
            const value = await repository.getSubmodelElementValue(
                'http.//i40.customer.com/type/1/1/7A7104BDAB57E184',
                'MaxRotationSpeed',
                'deep',
                'withoutBlobValue',
            );

            expect(value).toEqual(5000);
        });

        it('throws an error if idShortPath is invalid', async () => {
            await expect(
                repository.getSubmodelElementValue(
                    'http.//i40.customer.com/type/1/1/7A7104BDAB57E184',
                    'unknown',
                    'deep',
                    'withoutBlobValue',
                ),
            ).rejects.toThrowError();
        });
    });

    describe('patchSubmodelElementValue', () => {
        it('updates a Submodel Element value', async () => {
            await expect(
                repository.patchSubmodelElementValue(
                    'http.//i40.customer.com/type/1/1/7A7104BDAB57E184',
                    'MaxRotationSpeed',
                    6000,
                ),
            ).resolves.toBe(void 0);
        });

        it('throws an error if idShortPath is invalid', async () => {
            await expect(
                repository.patchSubmodelElementValue(
                    'http.//i40.customer.com/type/1/1/7A7104BDAB57E184',
                    'unknown',
                    6000,
                ),
            ).rejects.toThrowError();
        });

        it('throws an error if value is invalid', async () => {
            await expect(
                repository.patchSubmodelElementValue(
                    'http.//i40.customer.com/type/1/1/7A7104BDAB57E184',
                    'MaxRotationSpeed',
                    'invalid value',
                ),
            ).rejects.toThrowError();
        });
    });
});
