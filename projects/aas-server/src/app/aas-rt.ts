/******************************************************************************
 *
 * Copyright (c) 2019-2026 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import 'reflect-metadata';
import { container, instanceCachingFactory } from 'tsyringe';
import { parentPort } from 'worker_threads';
import { LOGGER, LoggerProxy } from 'aas-package';
import { RuntimeApp } from './runtime-app';

parentPort?.once('close', () => {
    container.dispose();
});

container.register(LOGGER, { useFactory: instanceCachingFactory(c => c.resolve(LoggerProxy)) });

container.resolve(RuntimeApp);
