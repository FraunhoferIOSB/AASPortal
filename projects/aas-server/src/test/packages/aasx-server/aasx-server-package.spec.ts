/******************************************************************************
 *
 * Copyright (c) 2019-2023 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { aas } from 'common';
import { Logger } from '../../../app/logging/logger.js';
import { AasxServer } from '../../../app/packages/aasx-server/aasx-server.js';
import { AasxServerPackage } from '../../../app/packages/aasx-server/aasx-server-package.js';
import { createSpyObj } from '../../utils.js';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

describe('AasxServerPackage', function () {
    let aasPackage: AasxServerPackage;
    let logger: jest.Mocked<Logger>;
    let server: jest.Mocked<AasxServer>;
    let env: aas.Environment;

    beforeEach(function () {
        logger = createSpyObj<Logger>(['error', 'warning', 'info', 'debug', 'start', 'stop']);
        server = createSpyObj<AasxServer>(['readEnvironmentAsync'], {
            url: new URL('http:/localhost:1234'),
            baseUrl: new URL('http:/localhost:1234')
        });

        aasPackage = new AasxServerPackage(logger, server, 'CunaCup_Becher1');
        env = {
            assetAdministrationShells: [{
                id: 'Sample AAS',
                idShort: 'http://www.fraunhofer.de/aas',
                modelType: 'AssetAdministrationShell',
                assetInformation: { assetKind: 'Instance' }
            }], submodels: [], conceptDescriptions: []
        };
    });

    it('creates a document', async function () {
        server.readEnvironmentAsync.mockReturnValue(
            new Promise<aas.Environment>((resolve, _) => resolve(env)));

        await expect(aasPackage.createDocumentAsync()).resolves.toBeTruthy();
    });
});