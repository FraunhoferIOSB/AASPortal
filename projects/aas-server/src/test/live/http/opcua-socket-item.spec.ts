/******************************************************************************
 *
 * Copyright (c) 2019-2023 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { beforeEach, describe, expect, it } from '@jest/globals';
import { HttpSocketItem } from '../../../app/live/http/http-socket-item.js';

describe('HttpSocketItem', function () {
    let item: HttpSocketItem;

    beforeEach(function () {
        item = new HttpSocketItem({ nodeId: '', valueType: 'xs:integer' }, 'http://localhost:1234');
    });

    it('should be created', function() {
        expect(item).toBeTruthy();
        expect(item.url).toEqual('http://localhost:1234');
        expect(item.node).toEqual({ nodeId: '', valueType: 'xs:integer' });
    });
});