/******************************************************************************
 *
 * Copyright (c) 2019-2023 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { noop } from 'lodash-es';
import { SocketSubscription } from './socket-subscription.js';

/** Provides an empty WebSocket subscription. */
export class EmptySubscription extends SocketSubscription {
    public open(): void {
        noop();
    }

    public close(): void {
        noop();
    }
}
