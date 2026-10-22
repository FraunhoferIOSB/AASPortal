/******************************************************************************
 *
 * Copyright (c) 2019-2026 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { singleton, Disposable } from 'tsyringe';
import { MessagePort, parentPort } from 'worker_threads';
import { EventData, isCommandData, LoggerProxy, WorkerData } from 'aas-package';

@singleton()
export class RuntimeApp implements Disposable {
    private readonly logger?: LoggerProxy;
    private readonly timer?: NodeJS.Timeout;
    private readonly startTime: number;

    public constructor() {
        parentPort?.on('message', this.parentPortOnMessage);

        this.startTime = Date.now();
        this.timer = setInterval(this.signalGenerator, 100);
    }

    public dispose(): Promise<void> | void {
        clearInterval(this.timer);
    }

    private readonly parentPortOnMessage = (data: WorkerData): void => {
        if (isCommandData(data)) {
            if (data.name === 'ConnectLogger') {
                const port = data.args.port as MessagePort;
                if (this.logger instanceof LoggerProxy) {
                    this.logger.connect(port);
                }
            }
        }
    };

    private readonly signalGenerator = (): void => {
        const elapsedMs = Date.now() - this.startTime;
        const data: EventData = {
            type: 'event',
            name: 'Signal',
            args: { value: Math.sin((2 * Math.PI * 0.25 * elapsedMs) / 1000) },
        };

        parentPort?.postMessage(data);
    };
}
