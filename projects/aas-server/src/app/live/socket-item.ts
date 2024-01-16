/******************************************************************************
 *
 * Copyright (c) 2019-2023 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { LiveNode } from 'common';

export interface SocketItem {
    node: LiveNode;
    subscribe(item: unknown): void;
    unsubscribe(): void;
}
