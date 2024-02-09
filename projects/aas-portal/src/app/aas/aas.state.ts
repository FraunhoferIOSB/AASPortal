/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { AASDocument, TemplateDescriptor } from 'common';

export interface TemplateStorage {
    timestamp: number;
    templates: TemplateDescriptor[];
}

export interface AASState {
    document: AASDocument | null;
    state: 'online' | 'offline';
    search: string;
    templateStorage: TemplateStorage;
    error: Error | null;
}

export const initialState: AASState = {
    document: null,
    search: '',
    state: 'offline',
    templateStorage: {
        timestamp: 0,
        templates: [],
    },
    error: null,
};

export interface State {
    aas: AASState;
}
