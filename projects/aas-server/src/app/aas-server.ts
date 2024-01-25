/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import 'reflect-metadata';
import { container } from 'tsyringe';
import { CookieStorageFactory } from './auth/cookie-storage-factory.js';
import { UserStorageFactory } from './auth/user-storage-factory.js';
import { LoggerFactory } from './logging/logger-factory.js';
import { FileLogger } from './logging/file-logger.js';
import { TemplateStorageFactory } from './template/template-storage-factory.js';
import { WSServer } from './ws-server.js';
import { AASProvider } from './aas-provider/aas-provider.js';
import { AASIndexFactory } from './aas-index/aas-index-factory.js';

container.registerInstance('USERS_DIR', './users');
container.registerSingleton('Logger', FileLogger);
container.register('AASIndex', { useFactory: c => new AASIndexFactory(c).create() });
container.register('CookieStorage', { useFactory: c => new CookieStorageFactory(c).create() });
container.register('UserStorage', { useFactory: c => new UserStorageFactory(c).create() });
container.register('winston.Logger', { useFactory: () => new LoggerFactory().create() });
container.register('TemplateStorage', { useFactory: c => new TemplateStorageFactory(c).create() });

container.afterResolution(
    AASProvider,
    (_, instance) => {
        (instance as AASProvider).start(container.resolve(WSServer));
    },
    { frequency: 'Once' },
);

container.resolve(WSServer).run();
container.resolve(AASProvider);