/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { describe, beforeEach, it, expect } from '@jest/globals';
import { JsonWriterV2 } from '../../app/packages/json-writer-v2.js';
import env from '../assets/aas-environment.js';

describe('JsonWriterV2', function () {
    describe('writeEnvironment', function () {
        let writer: JsonWriterV2;

        beforeEach(() => {
            writer = new JsonWriterV2();
        });

        it('is not implemented', () => {
            expect(() => writer.writeEnvironment(env)).toThrowError();
        });
    });

    describe('write', () => {
        let writer: JsonWriterV2;

        beforeEach(() => {
            writer = new JsonWriterV2();
        });

        it('does not support writing an AAS', () => {
            expect(() => writer.write(env.assetAdministrationShells[0])).toThrowError();
        });

        it('writes a submodel', () => {
            expect(writer.write(env.submodels[0])).toBeDefined();
        });
    });
});