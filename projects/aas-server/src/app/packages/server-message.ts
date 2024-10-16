/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import http from 'http';
import https from 'https';
import net from 'net';
import FormData from 'form-data';
import { parseUrl } from '../convert.js';

export class ServerMessage {
    /**
     * Gets an object of type `T` from a server.
     * @param url The URL of the object.
     * @template T The type of the object.
     * @returns The requested object.
     */
    public get<T extends object>(url: URL): Promise<T> {
        return new Promise((result, reject) => {
            const options: http.RequestOptions = {
                host: url.hostname,
                port: url.port,
                path: url.pathname + url.search,
                method: 'GET',
                timeout: 3000,
            };

            const requester = url.protocol === 'https:' ? https.request : http.request;
            const request = requester(options, response => {
                let data = '';
                response.on('data', (chunk: string) => {
                    data += chunk;
                });

                response.on('end', () => {
                    try {
                        ServerMessage.checkStatusCode(response, data);
                        result(JSON.parse(data));
                    } catch (error) {
                        reject(error);
                    }
                });

                response.on('error', error => reject(error));
            });

            request
                .on('timeout', () => request.destroy())
                .on('error', error => reject(error))
                .end();
        });
    }

    /**
     * Gets the response of the request with the specified URL.
     * @param url The URL of the request.
     * @returns The request.
     */
    public getResponse(url: URL): Promise<http.IncomingMessage> {
        return new Promise((result, reject) => {
            const options: http.RequestOptions = {
                host: url.hostname,
                port: url.port,
                path: url.pathname + url.search,
                method: 'GET',
                timeout: 3000,
            };

            const requester = url.protocol === 'https:' ? https.request : http.request;
            const request = requester(options, response => result(response));
            request
                .on('timeout', () => request.destroy())
                .on('error', error => reject(error))
                .end();
        });
    }

    /**
     * Updates the specified object.
     * @param url The destination URL.
     * @param obj The object to send.
     */
    public put(url: URL, obj: object): Promise<string> {
        return new Promise((result, reject) => {
            const data = JSON.stringify(obj);
            const options: http.RequestOptions = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname + url.search,
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data),
                },
            };

            const requester = url.protocol === 'https:' ? https.request : http.request;
            const request = requester(options, response => {
                let responseData = '';
                response.on('data', (chunk: string) => {
                    responseData += chunk;
                });

                response.on('end', () => {
                    try {
                        ServerMessage.checkStatusCode(response, responseData);
                        result(responseData);
                    } catch (error) {
                        reject(error);
                    }
                });

                response.on('error', error => reject(error));
            }).on('error', error => reject(error));

            request.write(data);
            request.end();
        });
    }

    /**
     * Inserts the specified object.
     * @param url The destination URL.
     * @param obj The object to send.
     */
    public post(url: URL, obj: FormData | object): Promise<string> {
        return obj instanceof FormData ? this.postFormData(url, obj) : this.postObject(url, obj);
    }

    /**
     * Deletes an object.
     * @param url The URL of the object to delete.
     */
    public delete(url: URL): Promise<string> {
        return new Promise((result, reject) => {
            const options: https.RequestOptions = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname + url.search,
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            const requester = url.protocol === 'https:' ? https.request : http.request;
            requester(options, response => {
                let responseData = '';
                response.on('data', (chunk: string) => {
                    responseData += chunk;
                });

                response.on('end', function () {
                    try {
                        ServerMessage.checkStatusCode(response, responseData);
                        result(responseData);
                    } catch (error) {
                        reject(error);
                    }
                });

                response.on('error', error => reject(error));
            })
                .on('error', error => reject(error))
                .end();
        });
    }

    /**
     * Checks the connection to resource with the specified URL.
     * @param url The current URL.
     */
    public checkUrlExist(url: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const temp = parseUrl(url);
            const port = Number(temp.port ? temp.port : temp.protocol === 'http:' ? 80 : 443);
            const socket = net.createConnection(port, temp.hostname);
            socket.setTimeout(3000);
            socket.on('connect', () => {
                socket.end();
            });

            socket.on('end', () => {
                socket.destroy();
                resolve();
            });

            socket.on('timeout', () => {
                socket.destroy();
                reject(new Error(`${url} does not exist.`));
            });

            socket.on('error', () => {
                socket.destroy();
                reject(new Error(`${url} does not exist.`));
            });
        });
    }

    private postObject(url: URL, obj: object): Promise<string> {
        return new Promise((result, reject) => {
            const data = JSON.stringify(obj);
            const options: http.RequestOptions = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data),
                },
            };

            const requester = url.protocol === 'https:' ? https.request : http.request;
            const request = requester(options, response => {
                let responseData = '';
                response.on('data', (chunk: string) => {
                    responseData += chunk;
                });

                response.on('end', () => {
                    try {
                        ServerMessage.checkStatusCode(response, responseData);
                        result(responseData);
                    } catch (error) {
                        reject(error);
                    }
                });

                response.on('error', error => reject(error));
            }).on('error', error => reject(error));

            request.write(data);
            request.end();
        });
    }

    private postFormData(url: URL, formData: FormData): Promise<string> {
        return new Promise((result, reject) => {
            const options: http.RequestOptions = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname + url.search,
                method: 'POST',
                headers: formData.getHeaders(),
            };

            const requester = url.protocol === 'https:' ? https.request : http.request;
            const request = requester(options, response => {
                let responseData = '';
                response.on('data', (chunk: string) => {
                    responseData += chunk;
                });

                response.on('end', function () {
                    try {
                        ServerMessage.checkStatusCode(response, responseData);
                        result(responseData);
                    } catch (error) {
                        reject(error);
                    }
                });

                response.on('error', error => reject(error));
            }).on('error', error => reject(error));

            formData.pipe(request);
        });
    }

    private static checkStatusCode(response: http.IncomingMessage, data?: string): void {
        if (!response.statusCode) {
            throw new Error(data ? `Unknown status code: ${data}` : 'Unknown status code.');
        }

        if (response.statusCode < 200 || response.statusCode >= 300) {
            throw new Error(
                data
                    ? `(${response.statusCode}) ${response.statusMessage}: ${data}`
                    : `(${response.statusCode}) ${response.statusMessage}.`,
            );
        }
    }
}
