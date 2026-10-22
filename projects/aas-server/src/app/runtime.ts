/******************************************************************************
 *
 * Copyright (c) 2019-2026 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { container, singleton } from 'tsyringe';
import { isMainThread, MessageChannel, SHARE_ENV, Worker } from 'worker_threads';
import path from 'path';
import { aas, jsonization } from 'aas-core';
import { isConnectable, LOGGER, WorkerData } from 'aas-package';

import { Variable } from './variable.js';

const RotationSpeed: aas.Property = {
    idShort: 'RotationSpeed',
    modelType: 'Property',
    category: 'VARIABLE',
    semanticId: {
        type: 'ModelReference',
        keys: [
            {
                type: 'ConceptDescription',
                value: 'http://customer.com/cd//1/1/18EBD56F6B43D895',
            },
        ],
    },
    valueType: 'xs:integer',
    value: '4370',
};

const Torque: aas.Property = {
    idShort: 'Torque',
    modelType: 'Property',
    category: 'VARIABLE',
    semanticId: {
        type: 'ModelReference',
        keys: [
            {
                type: 'ConceptDescription',
                value: 'http://customer.com/cd//1/1/18EBD56F6B43D896',
            },
        ],
    },
    valueType: 'xs:float',
    value: '117.4',
};

const TestOperation: aas.Operation = {
    category: 'PARAMETER',
    idShort: 'TestOperation',
    qualifiers: [
        {
            type: 'Demo',
            valueType: 'xs:string',
            value: 'true',
        },
    ],
    inputVariables: [
        {
            value: {
                category: 'VARIABLE',
                idShort: 'TestInVar',
                valueType: 'xs:integer',
                value: '1234',
                modelType: 'Property',
            } as aas.Property,
        },
    ],
    outputVariables: [
        {
            value: {
                category: 'VARIABLE',
                idShort: 'TestOutVar',
                valueType: 'xs:string',
                modelType: 'Property',
            } as aas.Property,
        },
    ],
    inoutputVariables: [
        {
            value: {
                category: 'VARIABLE',
                idShort: 'TestInOutVar',
                valueType: 'xs:integer',
                value: '5678',
                modelType: 'Property',
            } as aas.Property,
        },
    ],
    modelType: 'Operation',
};

@singleton()
export class Runtime {
    private readonly variable = container.resolve(Variable);
    private readonly logger = container.resolve(LOGGER);
    private readonly startTime = Date.now();
    private worker?: Worker;

    private readonly map = new Map<string, aas.Referable>([
        ['http://i40.customer.com/instance/1/1/AC69B1CB44F07935/RotationSpeed', RotationSpeed],
        ['http://i40.customer.com/instance/1/1/AC69B1CB44F07935/Torque', Torque],
        ['http://i40.customer.com/instance/1/1/AC69B1CB44F07935/TestOperation', TestOperation],
    ]);

    public constructor() {
        if (isMainThread) {
            const script = path.resolve(this.variable.CONTENT_ROOT, 'aas-rt.js');
            const name = 'Runtime Worker';
            this.worker = new Worker(script, { env: SHARE_ENV, name });
            this.worker.on('error', this.onWorkerError);
            this.worker.on('message', this.onWorkerMessage);

            this.connectLogger(this.worker, name);
        }
    }

    public async getValue(id: string, idShortPath: string): Promise<jsonization.JsonValue | undefined> {
        const element = this.map.get(id + '/' + idShortPath);
        if (!element || element.modelType !== 'Property') {
            return undefined;
        }

        const elapsedMs = Date.now() - this.startTime;
        return Math.sin((2 * Math.PI * 0.25 * elapsedMs) / 1000);
    }

    private connectLogger(worker: Worker, name: string): void {
        const loggerChannel = new MessageChannel();
        if (isConnectable(this.logger)) {
            this.logger.connect(loggerChannel.port2, name);
        }

        worker.postMessage(
            {
                type: 'command',
                name: 'ConnectLogger',
                args: { port: loggerChannel.port1, name: 'Logger' },
            },
            [loggerChannel.port1],
        );
    }

    private readonly onWorkerMessage = (data: WorkerData): void => {
        this.logger.info(`Received message from worker: ${data.type}`);
    };

    private readonly onWorkerError = (error: Error): void => {
        this.logger.error(`Received error from worker: ${error.message}`);
    };
}
