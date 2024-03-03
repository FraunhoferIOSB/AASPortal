/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { AASContainer } from 'common';
import { ScanStatistic } from './scan-result.js';

export interface WorkerData {
    taskId: number;
    type: 'ScanContainerData' | 'ScanTemplatesData';
    statistic: ScanStatistic;
}

export interface ScanContainerData extends WorkerData {
    type: 'ScanContainerData';
    container: AASContainer;
}

export interface ScanTemplatesData extends WorkerData {
    type: 'ScanTemplatesData';
}

export function isScanContainerData(data: WorkerData): data is ScanContainerData {
    return data.type === 'ScanContainerData';
}

export function isScanTemplates(data: WorkerData): data is ScanTemplatesData {
    return data.type === 'ScanTemplates';
}
