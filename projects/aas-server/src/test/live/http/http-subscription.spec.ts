/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { aas, DefaultType, LiveRequest } from 'common';
import { Logger } from '../../../app/logging/logger.js';
import { HttpSubscription } from '../../../app/live/http/http-subscription.js';
import { SocketClient } from '../../../app/live/socket-client.js';
import { AASServer } from '../../../app/packages/aas-server/aas-server.js';
import env from '../../assets/aas-environment.js';
import { createSpyObj, DoneFn } from '../../utils.js';

describe('HttpSubscription', function () {
    let aasxServer: jest.Mocked<AASServer>;
    let logger: jest.Mocked<Logger>;
    let client: jest.Mocked<SocketClient>;
    let subscription: HttpSubscription;

    beforeEach(function () {
        logger = createSpyObj<Logger>(['error', 'warning', 'info', 'debug', 'start', 'stop']);
        client = createSpyObj<SocketClient>(['has', 'subscribe', 'notify']);
        aasxServer = createSpyObj<AASServer>([
            'getShellsAsync',
            'commitAsync',
            'openFileAsync',
            'readValueAsync',
            'resolveNodeId',
        ]);

        const reference: aas.Reference = {
            type: 'ModelReference',
            keys: [
                {
                    type: 'Submodel',
                    value: 'http://i40.customer.com/type/1/1/F13E8576F6488342',
                },
                {
                    type: 'Property',
                    value: 'GLN',
                },
            ],
        };

        const request: LiveRequest = {
            endpoint: 'FileSystem',
            id: 'http://customer.com/aas/9175_7013_7091_9168',
            nodes: [
                {
                    nodeId: JSON.stringify(reference),
                    valueType: 'xs:integer',
                },
            ],
        };

        subscription = new HttpSubscription(logger, aasxServer, client, request, env);
    });

    it('should be created', function () {
        expect(subscription).toBeTruthy();
    });

    it('open/close subscription', (done: DoneFn) => {
        jest.useFakeTimers();
        aasxServer.readValueAsync.mockReturnValue(
            new Promise<DefaultType>(result => {
                expect(true).toBeTruthy();
                result(42);
                subscription.close();
                done();
            }),
        );

        subscription.open();
    });
});
