/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { AASDocument, AASContainer, Message } from 'common';

export enum ScanResultType {
    Added,
    Removed,
    Changed,
    End,
}

/** Provides statistic information about a container scan. */
export interface ScanStatistic {
    /** Start time. */
    start: number;
    /** End time */
    end: number;
    /** The number of scan cycles. */
    counter: number;
    /** The number of changed AAS documents.*/
    changed: number;
    /** The number of new AAS documents. */
    new: number;
    /** The number of deleted AAS documents. */
    deleted: number;
    /** The number of offline events. */
    offline: number;
}

/** The result of a container scan. */
export interface ScanResult {
    /** The result. */
    type: ScanResultType;
    /** The task identifier. */
    taskId: number;
    /** Statistic information. */
    statistic: ScanStatistic;
    /** The message memory. */
    messages?: Message[];
}

/** The result of a container scan. */
export interface ScanContainerResult extends ScanResult {
    /** The AAS container. */
    container: AASContainer;
    /** The result subject. */
    document: AASDocument;
}