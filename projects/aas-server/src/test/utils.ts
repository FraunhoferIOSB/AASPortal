/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

/* eslint-disable @typescript-eslint/no-explicit-any */

import { expect, jest } from '@jest/globals';

type Func = (...args: any[]) => any;

export type SpyObjMethodNames<T = undefined> = T extends undefined
    ? ReadonlyArray<string> | { [methodName: string]: any }
    : ReadonlyArray<keyof T> | { [P in keyof T]?: T[P] extends Func ? ReturnType<T[P]> : any };

export type SpyObjPropertyNames<T = undefined> = T extends undefined
    ? ReadonlyArray<string> | { [propertyName: string]: any }
    : ReadonlyArray<keyof T> | { [P in keyof T]?: T[P] };

export function createSpyObj<T extends object>(
    methodNames: SpyObjMethodNames<T>,
    propertyNames?: SpyObjPropertyNames<T>,
): jest.Mocked<T> {
    const obj: any = {};

    if (Array.isArray(methodNames)) {
        for (const methodName of methodNames) {
            obj[methodName] = jest.fn();
        }
    } else {
        for (const methodName in methodNames) {
            obj[methodName] = jest.fn();
        }
    }

    if (propertyNames) {
        if (Array.isArray(propertyNames)) {
            for (const propertyName of propertyNames) {
                obj[propertyName] = undefined;
            }
        } else {
            for (const propertyName in propertyNames) {
                obj[propertyName] = propertyNames[propertyName];
            }
        }
    }

    return obj as jest.Mocked<T>;
}

export type DoneFn = (...args: any[]) => void;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function fail(message?: string) {
    expect(false).toBe(true);
}
