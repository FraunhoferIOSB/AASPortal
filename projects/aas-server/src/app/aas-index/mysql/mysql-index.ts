/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { v4 } from 'uuid';
import mysql, { Connection, ResultSetHeader } from 'mysql2/promise';
import { AASEndpoint, AASCursor, AASPage, AASDocument, flat, aas, AASDocumentId, isIdentifiable } from 'common';
import { AASIndex } from '../aas-index.js';
import { Variable } from '../../variable.js';
import { urlToEndpoint } from '../../configuration.js';
import { MySqlQuery } from './mysql-query.js';
import { MySqlDocument, MySqlEndpoint } from './mysql-types.js';
import { isEmpty } from 'lodash-es';

export class MySqlIndex extends AASIndex {
    private readonly connection: Promise<Connection>;

    public constructor(private readonly variable: Variable) {
        super();

        this.connection = this.initialize();
    }

    public override async getEndpoints(): Promise<AASEndpoint[]> {
        return (await (await this.connection).query<MySqlEndpoint[]>('SELECT * FROM `endpoints`'))[0].map(
            row =>
                ({
                    name: row.name,
                    url: row.url,
                    type: row.type,
                    version: row.version,
                }) as AASEndpoint,
        );
    }

    public override async getEndpoint(name: string): Promise<AASEndpoint> {
        const [results] = await (
            await this.connection
        ).query<MySqlEndpoint[]>('SELECT * FROM `endpoints` WHERE name = ?', [name]);

        if (results.length === 0) {
            throw new Error(`An endpoint with the name "${name}" does not exist.`);
        }

        const endpoint = results[0];

        return { name: endpoint.name, url: endpoint.url, type: endpoint.type, version: endpoint.version };
    }

    public override async addEndpoint(endpoint: AASEndpoint): Promise<void> {
        await (
            await this.connection
        ).query<ResultSetHeader>('INSERT INTO `endpoints` (name, url, type, version) VALUES (?, ?, ?, ?)', [
            endpoint.name,
            endpoint.url,
            endpoint.type,
            endpoint.version,
        ]);
    }

    public override async removeEndpoint(name: string): Promise<boolean> {
        const result = await (
            await this.connection
        ).query<ResultSetHeader>('DELETE FROM `endpoints` WHERE name = ?', [name]);

        return result[0].affectedRows > 0;
    }

    public override getDocuments(cursor: AASCursor, query?: string, language?: string): Promise<AASPage> {
        let q: MySqlQuery | undefined;
        if (query) {
            q = new MySqlQuery(query, language ?? 'en');
        }

        if (cursor.next) {
            return this.getNextPage(cursor.next, cursor.limit);
        }

        if (cursor.previous) {
            return this.getPreviousPage(cursor.previous, cursor.limit);
        }

        if (cursor.previous === null) {
            return this.getFirstPage(cursor.limit, q);
        }

        return this.getLastPage(cursor.limit);
    }

    public override async getContainerDocuments(endpointName: string): Promise<AASDocument[]> {
        return (
            await (
                await this.connection
            ).query<MySqlDocument[]>('SELECT * FROM `documents` WHERE endpoint = ?', [endpointName])
        )[0].map(row => this.toDocument(row));
    }

    public override async update(document: AASDocument): Promise<void> {
        const connection = await this.connection;
        try {
            await connection.beginTransaction();
            const result = await connection.query<MySqlDocument[]>(
                'SELECT uuid FROM `documents` WHERE endpoint = ? AND id = ?;',
                [document.endpoint, document.id],
            );

            if (result[0].length === 0) {
                return;
            }

            const uuid = result[0][0].uuid;
            await connection.query<ResultSetHeader>(
                'UPDATE `documents` SET address = ?, crc32 = ?, idShort = ?, onlineReady = ?, readonly = ?, timestamp = ?, thumbnail = ? WHERE uuid = ?',
                [
                    document.address,
                    document.crc32,
                    document.idShort,
                    !!document.onlineReady,
                    document.readonly,
                    document.timestamp,
                    document.thumbnail,
                    uuid,
                ],
            );

            if (document.content) {
                await connection.query<ResultSetHeader>('DELETE FROM `elements` WHERE uuid = ?;', [uuid]);

                await this.traverseEnvironment(connection, uuid, document.content);
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        }
    }

    public override async add(document: AASDocument): Promise<void> {
        const connection = await this.connection;
        try {
            await connection.beginTransaction();
            const uuid = v4();
            await connection.query<ResultSetHeader>(
                'INSERT INTO `documents` (uuid, address, crc32, endpoint, id, idShort, assetId, onlineReady, readonly, thumbnail, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    uuid,
                    document.address,
                    document.crc32,
                    document.endpoint,
                    document.id,
                    document.idShort,
                    document.assetId,
                    !!document.onlineReady,
                    document.readonly,
                    document.thumbnail ?? '',
                    BigInt(document.timestamp),
                ],
            );

            if (document.content) {
                await this.traverseEnvironment(connection, uuid, document.content);
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        }
    }

    public override async find(endpoint: string | undefined, id: string): Promise<AASDocument | undefined> {
        const document = endpoint ? await this.selectEndpointDocument(endpoint, id) : await this.selectDocument(id);
        if (!document) {
            return undefined;
        }

        return this.toDocument(document);
    }

    public override async remove(endpointName: string, id: string): Promise<boolean> {
        const connection = await this.connection;
        try {
            await connection.beginTransaction();
            const [results] = await connection.query<MySqlDocument[]>(
                'SELECT uuid FROM `documents` WHERE endpoint = ? AND id = ?;',
                [endpointName, id],
            );

            if (results.length === 0) {
                return false;
            }

            const uuid = results[0].uuid;
            await connection.query<ResultSetHeader>('DELETE FROM `elements` WHERE uuid = ?;', [uuid]);
            await connection.query<ResultSetHeader>('DELETE FROM `documents` WHERE uuid = ?;', [uuid]);
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            return false;
        }
    }

    public override async reset(): Promise<void> {
        const connection = await this.connection;
        try {
            await connection.beginTransaction();
            await connection.query<ResultSetHeader>('DELETE FROM `elements`;');
            await connection.query<ResultSetHeader>('DELETE FROM `documents`;');
            await connection.query<ResultSetHeader>('DELETE FROM `endpoints`;');
            await this.addDefaultEndpoints(connection);
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        }
    }

    private async getFirstPage(limit: number, query?: MySqlQuery): Promise<AASPage> {
        const connection = await this.connection;
        let sql: string;
        const values: unknown[] = [];
        if (query) {
            if (query.joinElements) {
                sql =
                    'SELECT DISTINCT documents.* FROM `documents` INNER JOIN `elements` ON documents.uuid = elements.uuid WHERE ' +
                    query.createSql(values) +
                    ' ORDER BY endpoint ASC, id ASC LIMIT ?;';
            } else {
                sql =
                    'SELECT * FROM `documents` WHERE ' +
                    query.createSql(values) +
                    ' ORDER BY endpoint ASC, id ASC LIMIT ?;';
            }
        } else {
            sql = 'SELECT * FROM `documents` ORDER BY endpoint ASC, id ASC LIMIT ?;';
        }

        values.push(limit + 1);
        const [results] = await connection.query<MySqlDocument[]>(sql, values);
        const documents = results.map(result => this.toDocument(result));

        return {
            previous: null,
            documents: documents.slice(0, limit),
            next: documents.length >= limit + 1 ? documents[limit] : null,
        };
    }

    private async getNextPage(current: AASDocumentId, limit: number, query?: MySqlQuery): Promise<AASPage> {
        const connection = await this.connection;
        let sql: string;
        const values: unknown[] = [current.endpoint + current.id];

        if (query) {
            if (query.joinElements) {
                sql =
                    'SELECT DISTINCT documents.* FROM `documents` INNER JOIN `elements` ON documents.uuid = elements.uuid WHERE CONCAT(endpoint, id) > ? AND (' +
                    query.createSql(values) +
                    ') ORDER BY documents.endpoint ASC, documents.id ASC LIMIT ?;';
            } else {
                sql =
                    'SELECT * FROM `documents` WHERE CONCAT(endpoint, id) > ? AND (' +
                    query.createSql(values) +
                    ') ORDER BY endpoint ASC, id ASC LIMIT ?;';
            }
        } else {
            sql = 'SELECT * FROM `documents` WHERE CONCAT(endpoint, id) > ? ORDER BY endpoint ASC, id ASC LIMIT ?;';
        }

        values.push(limit + 1);
        const [results] = await connection.query<MySqlDocument[]>(sql, values);
        const documents = results.map(result => this.toDocument(result));

        return {
            previous: current,
            documents: documents.slice(0, limit),
            next: documents.length >= limit + 1 ? documents[limit] : null,
        };
    }

    private async getPreviousPage(current: AASDocumentId, limit: number, query?: MySqlQuery): Promise<AASPage> {
        const connection = await this.connection;
        let sql: string;
        const values: unknown[] = [current.endpoint + current.id];

        if (query) {
            if (query.joinElements) {
                sql =
                    'SELECT DISTINCT documents.* FROM `documents` INNER JOIN `elements` ON documents.uuid = elements.uuid WHERE CONCAT(endpoint, id) < ? AND (' +
                    query.createSql(values) +
                    ') ORDER BY documents.endpoint DESC, documents.id DESC LIMIT ?;';
            } else {
                sql =
                    'SELECT * FROM `documents` WHERE CONCAT(endpoint, id) < ? AND (' +
                    query.createSql(values) +
                    ') ORDER BY endpoint DESC, id DESC LIMIT ?;';
            }
        } else {
            sql = 'SELECT * FROM `documents` WHERE CONCAT(endpoint, id) < ? ORDER BY endpoint DESC, id DESC LIMIT ?;';
        }

        values.push(limit + 1);
        const [results] = await connection.query<MySqlDocument[]>(sql, values);
        const documents = results.map(result => this.toDocument(result));

        return {
            previous: documents.length >= limit + 1 ? documents[0] : null,
            documents: documents.slice(0, limit).reverse(),
            next: current,
        };
    }

    private async getLastPage(limit: number, query?: MySqlQuery): Promise<AASPage> {
        const connection = await this.connection;
        let sql: string;
        const values: unknown[] = [];
        if (query) {
            if (query.joinElements) {
                sql =
                    'SELECT DISTINCT documents.* FROM `documents` INNER JOIN `elements` ON documents.uuid = elements.uuid WHERE ' +
                    query.createSql(values) +
                    ' ORDER BY documents.endpoint DESC, documents.id DESC LIMIT ?;';
            } else {
                sql =
                    'SELECT * FROM `documents` WHERE ' +
                    query.createSql(values) +
                    ' ORDER BY endpoint DESC, id DESC LIMIT ?;';
            }
        } else {
            sql = 'SELECT * FROM `documents` ORDER BY endpoint DESC, id DESC LIMIT ?;';
        }

        values.push(limit + 1);
        const [results] = await connection.query<MySqlDocument[]>(sql, values);
        const documents = results.map(result => this.toDocument(result));

        return {
            previous: documents.length >= limit + 1 ? documents[0] : null,
            documents: documents.slice(0, limit).reverse(),
            next: null,
        };
    }

    private async selectEndpointDocument(endpoint: string, id: string): Promise<MySqlDocument | undefined> {
        const [results] = await (
            await this.connection
        ).query<MySqlDocument[]>('SELECT * FROM `documents` WHERE endpoint = ? AND (id = ? OR assetId = ?)', [
            endpoint,
            id,
            id,
        ]);

        if (results.length === 0) {
            return undefined;
        }

        return results[0];
    }

    private async selectDocument(id: string): Promise<MySqlDocument | undefined> {
        const [results] = await (
            await this.connection
        ).query<MySqlDocument[]>('SELECT * FROM `documents` WHERE (id = ? OR assetId = ?)', [id, id]);

        if (results.length === 0) {
            return undefined;
        }

        return results[0];
    }

    private async traverseEnvironment(connection: Connection, documentId: string, env: aas.Environment): Promise<void> {
        for (const submodel of env.submodels) {
            for (const referable of flat(submodel)) {
                await this.writeElement(connection, documentId, referable);
            }
        }
    }

    private async writeElement(connection: Connection, uuid: string, referable: aas.Referable): Promise<void> {
        await connection.query<ResultSetHeader>(
            'INSERT INTO `elements` (uuid, modelType, id, idShort, stringValue, numberValue, dateValue, booleanValue, bigintValue) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);',
            [
                uuid,
                this.toAbbreviation(referable),
                isIdentifiable(referable) ? referable.id : undefined,
                referable.idShort,
                this.toStringValue(referable),
                this.toNumberValue(referable),
                this.toDateValue(referable),
                this.toBooleanValue(referable),
                this.toBigintValue(referable),
            ],
        );
    }

    private toDocument(result: MySqlDocument): AASDocument {
        return {
            address: result.address,
            crc32: result.crc32,
            endpoint: result.endpoint,
            id: result.id,
            idShort: result.idShort,
            assetId: result.assetId,
            readonly: result.readonly ? true : false,
            timestamp: Number(result.timestamp),
            content: null,
            onlineReady: result.onlineReady ? true : false,
            thumbnail: result.thumbnail,
        };
    }

    private async initialize(): Promise<Connection> {
        const url = new URL(this.variable.AAS_INDEX!);
        const username = isEmpty(url.username) ? this.variable.AAS_SERVER_USERNAME : url.username;
        const password = isEmpty(url.password) ? this.variable.AAS_SERVER_PASSWORD : url.password;
        const connection = await mysql.createConnection({
            host: url.hostname,
            port: Number(url.port),
            database: 'aas-index',
            user: username,
            password: password,
        });

        const result = await connection.query<MySqlEndpoint[]>('SELECT * FROM `endpoints`');
        if (result[0].length === 0) {
            await this.addDefaultEndpoints(connection);
        }

        return connection;
    }

    private async addDefaultEndpoints(connection: Connection): Promise<void> {
        for (const endpoint of this.variable.ENDPOINTS.map(endpoint => urlToEndpoint(endpoint))) {
            await connection.query<ResultSetHeader>(
                'INSERT INTO `endpoints` (name, url, type, version) VALUES (?, ?, ?, ?)',
                [endpoint.name, endpoint.url, endpoint.type, endpoint.version],
            );
        }
    }
}
