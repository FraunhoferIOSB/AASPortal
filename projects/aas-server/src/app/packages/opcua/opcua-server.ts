/******************************************************************************
 *
 * Copyright (c) 2019-2023 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import fs from 'fs';
import { LiveRequest, aas } from 'common';
import { Logger } from '../../logging/logger.js';
import { OpcuaSubscription } from '../../live/opcua/opcua-subscription.js';
import { SocketClient } from '../../live/socket-client.js';
import { SocketSubscription } from '../../live/socket-subscription.js';
import { AASPackage } from '../aas-package.js';
import { AASResource } from '../aas-resource.js';
import { OpcuaPackage } from './opcua-package.js';
import {
    ClientSession,
    ConnectionStrategyOptions,
    DataType,
    MessageSecurityMode,
    OPCUAClient,
    OPCUAClientOptions,
    SecurityPolicy,
    StatusCodes,
    VariantArrayType,
    VariantOptions,
    coerceNodeId
} from 'node-opcua';

export class OpcuaServer extends AASResource {
    private readonly options: OPCUAClientOptions;
    private client: OPCUAClient | null = null;
    private session: ClientSession | null = null;
    private reentry = 0;

    constructor(logger: Logger, url: string, name: string, options?: OPCUAClientOptions) {
        super(logger, url, name);

        if (options) {
            this.options = this.resolveOpcuaClientOptions(options);
        } else {
            this.options = {
                applicationName: 'aas-server',
                connectionStrategy: {
                    initialDelay: 1000,
                    maxRetry: 1
                },
                securityMode: MessageSecurityMode.None,
                securityPolicy: SecurityPolicy.None,
                endpointMustExist: false,
            };
        }
    }

    public override readonly version = '';

    public readonly readOnly = true;

    public readonly onlineReady = true;

    public get isOpen(): boolean {
        return this.reentry > 0;
    }

    /** 
     * Gets the current client session. 
     **/
    public getSession(): ClientSession {
        if (this.reentry <= 0 || this.session == null) {
            throw new Error(`No session to ${this.url} established.`);
        }

        return this.session;
    }

    public async testAsync(): Promise<void> {
        if (this.reentry === 0) {
            try {
                await this.openAsync();
            } finally {
                await this.closeAsync();
            }
        }
    }

    public async openAsync(): Promise<void> {
        if (this.reentry === 0) {
            this.client = OPCUAClient.create(this.options as OPCUAClientOptions);
            await this.client.connect(this.url);
            this.session = await this.client.createSession();
        }

        ++this.reentry;
    }

    public async closeAsync(): Promise<void> {
        if (this.reentry > 0) {
            --this.reentry;
            if (this.reentry === 0) {
                if (this.client) {
                    if (this.session) {
                        await this.client.closeSession(this.session, true);
                        this.session = null;
                    }

                    await this.client.disconnect();
                    this.client = null;
                }
            }
        }
    }

    public createPackage(address: string): AASPackage {
        return new OpcuaPackage(this.logger, this, address);
    }

    public createSubscription(client: SocketClient, message: LiveRequest): SocketSubscription {
        return new OpcuaSubscription(this.logger, client, this, message.nodes);
    }

    public getPackageAsync(aasIdentifier: string, name: string): Promise<NodeJS.ReadableStream> {
        throw new Error('Not implemented.');
    }

    public postPackageAsync(file: Express.Multer.File): Promise<AASPackage | undefined> {
        throw new Error('Not implemented.');
    }

    public deletePackageAsync(aasId: string, name: string): Promise<void> {
        throw new Error('Not implemented.');
    }

    public async invoke(env: aas.Environment, operation: aas.Operation): Promise<aas.Operation> {
        const inputArguments: Array<VariantOptions> = [];
        if (operation.inputVariables) {
            for (let i = 0; i < operation.inputVariables.length; i++) {
                inputArguments.push(await this.toVariantAsync(operation.inputVariables[i].value));
            }
        }

        const result = await this.session!.call({
            inputArguments: inputArguments,
            methodId: coerceNodeId(operation.methodId),
            objectId: coerceNodeId(operation.objectId)
        });

        if (result.statusCode.value !== StatusCodes.Good.value) {
            throw new Error(`Operation call returns with status code ${result.statusCode.toString()},`);
        }

        if (result.outputArguments && operation.outputVariables) {
            for (let index = 0; index < operation.outputVariables.length; ++index) {
                operation.outputVariables[index].value = result.outputArguments[index].value;
            }
        }

        return operation;
    }

    public getBlobValueAsync(env: aas.Environment, submodelId: string, idShortPath: string): Promise<string | undefined> {
        throw new Error('Not implemented.');
    }

    private resolveOpcuaClientOptions(options: OPCUAClientOptions): OPCUAClientOptions {
        if (options) {
            options = {
                applicationName: options.applicationName,
                connectionStrategy: this.resolveConnectionStrategy(options.connectionStrategy),
                securityMode: this.resolveMode(options.securityMode),
                securityPolicy: this.resolvePolicy(options.securityPolicy),
                endpointMustExist: options.endpointMustExist,
            } as OPCUAClientOptions;
        }

        return options;
    }

    private resolveConnectionStrategy(value?: ConnectionStrategyOptions): ConnectionStrategyOptions | undefined {
        if (value) {
            value =
            {
                initialDelay: value.initialDelay,
                maxRetry: value.maxRetry
            };
        }

        return value;
    }

    private resolveMode(value?: string | MessageSecurityMode): MessageSecurityMode {
        if (value) {
            return typeof value === 'string'
                ? MessageSecurityMode[value as keyof typeof MessageSecurityMode]
                : value;
        }

        return MessageSecurityMode.None;
    }

    private resolvePolicy(value?: string | SecurityPolicy): SecurityPolicy {
        if (value) {
            return typeof value === 'string'
                ? SecurityPolicy[value as keyof typeof SecurityPolicy]
                : value;
        }

        return SecurityPolicy.None;
    }

    private async toVariantAsync(value: aas.SubmodelElement): Promise<VariantOptions> {
        if (value.modelType === 'Property') {
            const property = value as aas.Property;
            switch (property.valueType) {
                case 'xs:string':
                    let buffer: Buffer;
                    if (typeof property.value === 'string') {
                        buffer = await fs.promises.readFile(property.value);
                    } else if (<any>property.value instanceof Buffer) {
                        buffer = <any>property.value as Buffer;
                    } else {
                        throw new Error('Not supported File representation.');
                    }

                    return this.createVariantOptions(VariantArrayType.Scalar, DataType.ByteString, buffer);
                default:
                    return this.createVariantOptions(
                        VariantArrayType.Scalar,
                        property.valueType,
                        property.value);
            }
        } else {
            throw new Error('Not implemented.');
        }
    }

    private createVariantOptions(
        arrayType: VariantArrayType,
        dataType: DataType | aas.DataTypeDefXsd | undefined,
        value: any): VariantOptions {
        if (typeof dataType === 'string') {
            dataType = (<any>DataType)[dataType];
        }

        if (typeof arrayType === 'string') {
            arrayType = (<any>VariantArrayType)[arrayType];
        }

        return {
            arrayType: arrayType,
            dataType: dataType,
            value: value,
            dimensions: Array.isArray(value) ? [1] : null
        }
    }
}