/******************************************************************************
 *
 * Copyright (c) 2019-2023 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { LiveNode } from 'common';
import { SocketItem } from '../socket-item.js';
import { noop } from 'lodash-es';

export class HttpSocketItem implements SocketItem {
    constructor(
        public readonly node: LiveNode, 
        public readonly url: string) {
    }

    public subscribe(): void {
        noop();
    }

    public unsubscribe(): void {
        noop();
    }
 }