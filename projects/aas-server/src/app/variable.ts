/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { singleton } from 'tsyringe';
import path from 'path';

@singleton()
export class Variable {
    public constructor() {
        this.JWT_SECRET = process.env.JWT_SECRET ?? 'The quick brown fox jumps over the lazy dog.';
        this.JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY;
        this.JWT_EXPIRES_IN = process.env.JWT_EXPIRED_IN ? Number(process.env.JWT_EXPIRED_IN) : 604800;
        this.NODE_SERVER_PORT = Number(process.env.NODE_SERVER_PORT);
        this.MAX_WORKERS = process.env.MAX_WORKERS ? Number(process.env.MAX_WORKERS) : 8;
        this.USER_STORAGE = process.env.USER_STORAGE;
        this.TEMPLATE_STORAGE = process.env.TEMPLATE_STORAGE ?? 'file:///templates';
        this.CORS_ORIGIN = process.env.CORS_ORIGIN ? JSON.parse(process.env.CORS_ORIGIN) : '*';
        this.CONTENT_ROOT = path.resolve(process.env.CONTENT_ROOT ?? './');
        this.WEB_ROOT = path.resolve(process.env.WEB_ROOT ?? './wwwroot');
        this.ASSETS = path.resolve(process.env.ASSETS ?? './assets');
        this.ENDPOINTS = process.env.ENDPOINTS ? JSON.parse(process.env.ENDPOINTS) : ['file:///samples?name=Samples'];
        this.TIMEOUT = process.env.TIMEOUT ? Number(process.env.TIMEOUT) : 5000;
        this.HTTPS_CERT_FILE = process.env.HTTPS_CERT_FILE;
        this.HTTPS_KEY_FILE = process.env.HTTPS_KEY_FILE;
        this.AAS_EXPIRES_IN = process.env.AAS_EXPIRES_IN ? Number(process.env.AAS_EXPIRES_IN) : 86400000;
        this.AAS_INDEX = process.env.AAS_INDEX;
        this.AAS_SERVER_USERNAME = process.env.AAS_SERVER_USERNAME ?? 'aas-server';
        this.AAS_SERVER_PASSWORD = process.env.AAS_SERVER_PASSWORD ?? 'aas-server';
    }

    /** The secret for HS256 encryption or the private key file for RS256 encryption. */
    public readonly JWT_SECRET: string;

    /** The public key file for RS256 encryption. */
    public readonly JWT_PUBLIC_KEY?: string;

    /** The validity of the JSON web token in seconds (bearer token). */
    public readonly JWT_EXPIRES_IN: number;

    /** The validity of the JSON web token in seconds (query parameter). */
    public readonly JWT_SHORT_EXP = 5;

    /** The port of the AASServer. */
    public readonly NODE_SERVER_PORT: number;

    /** The number of worker threads. */
    public readonly MAX_WORKERS: number;

    /** The URL of the user storage. */
    public readonly USER_STORAGE?: string;

    /** The URL of the template storage. */
    public readonly TEMPLATE_STORAGE: string;

    /** */
    public readonly CORS_ORIGIN: string | string[];

    /** The directory where the AASServer app is located. */
    public readonly CONTENT_ROOT: string;

    /** The root directory for static files. */
    public readonly WEB_ROOT: string;

    /** The assets directory. */
    public readonly ASSETS: string;

    /** The URLs of the initial AAS container endpoints. */
    public readonly ENDPOINTS: string[];

    /** */
    public readonly TIMEOUT: number;

    /** The key file if AASServer supports HTTPS. */
    public readonly HTTPS_KEY_FILE?: string;

    /** The certificate file if AASServer supports HTTPS. */
    public readonly HTTPS_CERT_FILE?: string;

    /** The validity period of an AAS in milliseconds. */
    public readonly AAS_EXPIRES_IN: number;

    /** The AASIndex realization. */
    public readonly AAS_INDEX?: string;

    /** ToDo */
    public readonly AAS_SERVER_USERNAME: string;

    /** ToDo */
    public readonly AAS_SERVER_PASSWORD: string;
}
