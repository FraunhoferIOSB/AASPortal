/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { inject, singleton } from 'tsyringe';
import express, { Express, NextFunction, Request, Response, json, urlencoded } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi, { JsonObject } from 'swagger-ui-express';
import { ApplicationError } from 'aas-core';
import { ValidateError } from 'tsoa';

import swaggerDoc from './swagger.json' with { type: 'json' };
import { RegisterRoutes } from './routes/routes.js';
import { ERRORS } from './errors.js';
import { Variable } from './variable.js';
import { Logger } from './logging/logger.js';

@singleton()
export class App {
    public constructor(
        @inject('Logger') private readonly logger: Logger,
        @inject(Variable) private readonly variable: Variable,
    ) {
        this.app = express();
        this.setup();
    }

    public readonly app: Express;

    private setup(): void {
        process.on('uncaughtException', (error: Error) => {
            this.logger.error(`Uncaught exception: ${error?.message} Stack: ${error?.stack}`);
        });

        process.on('unhandledRejection', (reason, promise) => {
            this.logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
        });

        this.app.use(
            cors({
                origin: this.variable.CORS_ORIGIN,
                credentials: true,
            }),
        );

        this.app.use(json());
        this.app.use(urlencoded({ extended: true }));
        this.app.use(morgan('dev'));
        this.app.use('/api-docs', this.setHost, swaggerUi.serveFiles(swaggerDoc, {}), swaggerUi.setup());

        RegisterRoutes(this.app);

        this.app.get('/', this.getIndex);
        this.app.use(express.static(this.variable.WEB_ROOT));

        this.app.use(this.notFoundHandler);
        this.app.use(this.errorHandler);
    }

    private errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction): Response | void => {
        if (err instanceof ValidateError) {
            return res.status(422).json({
                message: 'Validation Failed',
                details: err?.fields,
            });
        }

        if (err instanceof ApplicationError) {
            if (err.name === ERRORS.UnauthorizedAccess) {
                return res.status(401).json({
                    message: 'Unauthorized',
                });
            }

            return res.status(500).json({
                message: err.message,
            });
        }

        if (err instanceof Error) {
            return res.status(500).json({
                message: err.message,
            });
        }

        next();
    };

    private notFoundHandler = (_req: Request, res: Response) => {
        res.status(404).send({
            message: 'Not Found',
        });
    };

    private setHost = (req: Request, res: Response, next: NextFunction) => {
        (swaggerDoc as { host?: string }).host = req.get('host');
        (req as Request & { swaggerDoc: JsonObject }).swaggerDoc = swaggerDoc;
        next();
    };

    private getIndex = (req: Request, res: Response) => {
        res.sendFile(this.variable.WEB_ROOT + '/index.html');
    };
}
