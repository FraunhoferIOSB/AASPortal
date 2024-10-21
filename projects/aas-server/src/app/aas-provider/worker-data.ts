/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { AASDocument, AASEndpoint } from 'aas-core';

export interface WorkerData {
    taskId: number;
    type: 'ScanEndpointData' | 'ScanTemplatesData';
}

export interface ScanEndpointData extends WorkerData {
    type: 'ScanEndpointData';
    endpoint: AASEndpoint;
    documents: AASDocument[];
    cursor?: string;
}

export interface ScanTemplatesData extends WorkerData {
    type: 'ScanTemplatesData';
}

export function isScanEndpointData(data: WorkerData): data is ScanEndpointData {
    return data.type === 'ScanEndpointData';
}

export function isScanTemplatesData(data: WorkerData): data is ScanTemplatesData {
    return data.type === 'ScanTemplatesData';
}
