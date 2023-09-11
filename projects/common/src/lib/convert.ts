/******************************************************************************
 *
 * Copyright (c) 2019-2023 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { DataTypeDefXsd, LangString } from './aas.js';

const dateTimeFormat: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: "numeric",
    minute: "numeric",
    second: "numeric"
};

const invariantDecimalSeparator = '.';
const invariantGroupSeparator = ',';

export type DefaultType = string | number | boolean | bigint;

/**
 * Converts a value into an other data type.
 * @param value The current value.
 * @param type The destination data type.
 * @param localId The locale identifier.
 * @returns The converted value.
 */
export function changeType(value: any, type: DataTypeDefXsd, localId?: string): DefaultType | undefined {
    switch (type) {
        case 'xs:boolean':
            return toBoolean(value);
        case 'xs:anyURI':
            return convertToString(value);
        case 'xs:double':
        case 'xs:float':
        case 'xs:decimal':
            return toDouble(value, localId);
        case 'xs:integer':
        case 'xs:int':
        case 'xs:byte':
        case 'xs:short':
        case 'xs:unsignedByte':
        case 'xs:unsignedInt':
        case 'xs:unsignedShort':
            return toInteger(value);
        case 'xs:long':
        case 'xs:unsignedLong':
            return toBigInt(value);
        case 'xs:date':
        case 'xs:dateTime':
        case 'xs:time':
            return toTime(value, localId);
        case 'xs:string':
            return convertToString(value, localId);
        default:
            return value;
    }
}

/**
 * Converts a value to an equivalent string expression.
 * @param value The current value.
 * @param localeId The locale identifier.
 * @returns A string expression that represents the specified value.
 */
export function convertToString(value: unknown, localeId?: string): string {
    let s = '';
    if (value != null) {
        if (typeof value === 'string') {
            s = value;
        } else if (typeof value === 'boolean') {
            s = value ? 'true' : 'false';
        } else if (typeof value === 'number') {
            s = localeId ? value.toLocaleString(localeId) : value.toString();
        } else if (value instanceof Date) {
            s = localeId ? value.toLocaleString(localeId, dateTimeFormat) : value.toString();
        } else if (typeof value === 'bigint') {
            s = localeId ? value.toLocaleString(localeId) : value.toString();
        } else if (Array.isArray(value)) {
            s = `[${getItems(value).join(', ')}]`;
        } else if (typeof value === 'object') {
            s = `{ ${getProperties(value).join(', ')} }`;
        }
    }

    return s;

    function getProperties(obj: object): string[] {
        const items: string[] = [];
        for (const property in obj) {
            items.push(`${property}: ${convertToString((<any>obj)[property], localeId)}`)
        }

        return items;
    }

    function getItems(array: any[]): string[] {
        return array.map(item => convertToString(item, localeId));
    }
}

/**
 * Converts a string expression to an equivalent value of the specified type.
 * @param s The string expression.
 * @param valueType The value type.
 * @param localeId The locale identifier.
 * @returns A value of the specified type.
 */
export function convertFromString(
    s: string | null | undefined,
    valueType: DataTypeDefXsd,
    localeId?: string): DefaultType | undefined {
    if (!s) {
        return undefined;
    }

    switch (valueType) {
        case 'xs:boolean':
            return stringToBoolean(s);
        case 'xs:anyURI':
            return s;
        case 'xs:unsignedByte':
            return stringToByte(s);
        case 'xs:byte':
            return stringToSByte(s);
        case 'xs:double':
        case 'xs:float':
        case 'xs:decimal':
            return toDouble(s, localeId);
        case 'xs:integer':
        case 'xs:int':
        case 'xs:short':
        case 'xs:unsignedInt':
        case 'xs:unsignedShort':
            return toInteger(s);
        case 'xs:long':
        case 'xs:unsignedLong':
            return toBigInt(s);
        case 'xs:date':
        case 'xs:dateTime':
        case 'xs:time':
            return parseDate(s, localeId)?.getTime();
        case 'xs:string':
            return s;
        default:
            return undefined;
    }
}

/**
 * Converts a string expression to a number.
 * @param s The string expression.
 * @param localeId The locale identifier.
 * @returns A number.
 */
export function parseNumber(s: string, localeId?: string): number {
    let decimalSeparator: string;
    let groupSeparator: string;
    if (localeId) {
        const parts = Intl.NumberFormat(localeId).formatToParts(1234.56789);
        decimalSeparator = parts.find(part => part.type === 'decimal')!.value;
        groupSeparator = parts.find(part => part.type === 'group')!.value;
    } else {
        decimalSeparator = invariantDecimalSeparator;
        groupSeparator = invariantGroupSeparator;
    }

    const items = s.split(decimalSeparator);
    s = items[0].split(groupSeparator).join('');
    if (items.length > 1) {
        s += invariantDecimalSeparator + items[1];
    }

    return Number(s);
}

/**
 * Parses a localized string expression into a Date.
 * @param s The string expression that represents a date and time.
 * @param localeId The locale identifier.
 */
export function parseDate(s: string, localeId?: string): Date | undefined {
    const format = new Intl.DateTimeFormat(localeId, dateTimeFormat);
    const now = new Date();
    const parts = format.formatToParts(now);
    const tuple = getFormatInfo(parts);

    let date: Date | undefined;
    if (s) {
        s = s.trim().toLowerCase();
        if (localeId) {
            let dateItems: string[] | undefined;
            let timeTuple: { items: string[], timePeriod?: string } | undefined;
            if (s.indexOf(',') < 0) {
                if (s.indexOf(tuple.dateDelimiter) >= 0) {
                    dateItems = s.split(tuple.dateDelimiter);
                    const day = getDay(dateItems);
                    date = day
                        ? new Date(getYear(dateItems), getMonth(dateItems), getDay(dateItems))
                        : new Date(getYear(dateItems), getMonth(dateItems));
                } else {
                    timeTuple = splitTime(s);
                    date = new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        now.getDate(),
                        getHours(timeTuple?.items, timeTuple?.timePeriod),
                        getMinutes(timeTuple?.items),
                        getSeconds(timeTuple?.items));

                }
            } else {
                const dateTime = s.split(',');
                dateItems = dateTime[0].split(tuple.dateDelimiter);
                timeTuple = splitTime(dateTime[1]);
                date = new Date(
                    getYear(dateItems),
                    getMonth(dateItems),
                    getDay(dateItems),
                    getHours(timeTuple?.items, timeTuple?.timePeriod),
                    getMinutes(timeTuple?.items),
                    getSeconds(timeTuple?.items));
            }

        } else {
            date = new Date(s);
            if (date.toString() === 'Invalid Date') {
                date = parseDate(s, 'en');
            }
        }
    }

    return date;

    function getFormatInfo(parts: Intl.DateTimeFormatPart[]): {
        dateDelimiter: string,
        timeDelimiter: string,
        indexOfYear: number,
        indexOfMonth: number,
        indexOfDay: number,
        hours24: boolean
    } {
        const items = ['year', 'month', 'day']
            .sort((a, b) => parts.findIndex(item => item.type === a) - parts.findIndex(item => item.type === b));

        return {
            dateDelimiter: parts[3].value,
            timeDelimiter: parts[9].value,
            indexOfDay: items.indexOf('day'),
            indexOfMonth: items.indexOf('month'),
            indexOfYear: items.indexOf('year'),
            hours24: parts.findIndex(part => part.type === 'dayPeriod') < 0
        };
    }

    function splitTime(exp: string): { items: string[], timePeriod?: string } {
        if (exp.endsWith('am')) {
            return { items: exp.substring(0, exp.length - 2).split(tuple.timeDelimiter), timePeriod: 'am' };
        }

        if (exp.endsWith('pm')) {
            return { items: exp.substring(0, exp.length - 2).split(tuple.timeDelimiter), timePeriod: 'pm' };
        }

        return { items: exp.split(tuple.timeDelimiter) };
    }

    function getYear(items?: string[]): number {
        if (items) {
            if (items.length >= 3) {
                return Number(items[tuple.indexOfYear].trim());
            }

            if (items.length === 1) {
                return Number(items[0].trim());
            }

            if (items.length === 2) {
                return tuple.indexOfMonth < tuple.indexOfYear ? Number(items[1].trim()) : Number(items[0].trim());
            }
        }

        return 0;
    }

    function getMonth(items?: string[]): number {
        if (items) {
            if (items.length >= 3) {
                return Number(items[tuple.indexOfMonth].trim()) - 1;
            }

            if (items.length === 2) {
                return (tuple.indexOfMonth < tuple.indexOfYear ? Number(items[0].trim()) : Number(items[1].trim())) - 1;
            }
        }

        return 0;
    }

    function getDay(items?: string[]): number | undefined {
        return items && items.length >= 3 ? Number(items[tuple.indexOfDay].trim()) : undefined;
    }

    function getHours(items?: string[], timePeriod?: string): number {
        if (items && items.length > 0) {
            return Number(items[0].trim()) + (timePeriod === 'pm' ? 12 : 0);
        }

        return now.getDate();
    }

    function getMinutes(items?: string[]): number {
        return items && items.length > 1 ? Number(items[1].trim()) : 0;
    }

    function getSeconds(items?: string[]): number {
        return items && items.length > 2 ? Number(items[2].trim()) : 0;
    }
}

/**
 * Determines the data type from the specified string expression.
 * @param value The value or a string expression.
 * @returns The data type.
 */
export function determineType(value: any): DataTypeDefXsd | undefined {
    if (typeof value === 'string') {
        value = value.trim();
        if (value.length > 0) {
            const d = Number(value);
            if (!Number.isNaN(d)) {
                return Number.isInteger(d) ? 'xs:int' : 'xs:double';
            }

            if (value.toLocaleLowerCase() === 'true' || value.toLocaleLowerCase() === 'false') {
                return 'xs:boolean';
            }

            if (!Number.isNaN(Date.parse(value))) {
                return 'xs:dateTime';
            }

            // ToDo: How to check if expression is bigint?
        }

        return 'xs:string';
    } else if (typeof value === 'number') {
        return Number.isInteger(value) ? 'xs:int' : 'xs:double';
    } else if (typeof value === 'boolean') {
        return 'xs:boolean';
    } else if (typeof value === 'bigint') {
        return 'xs:long';
    } else if (value instanceof Date) {
        return 'xs:dateTime';
    }

    return undefined;
}

/**
 * Gets a default value for the specified data type.
 * @param type The data type.
 * @returns A default value.
 */
export function getDefaultValue(type: DataTypeDefXsd): any {
    switch (type) {
        case 'xs:boolean':
            return false;
        case 'xs:anyURI':
            return '';
        case 'xs:byte':
        case 'xs:double':
        case 'xs:float':
        case 'xs:decimal':
        case 'xs:integer':
        case 'xs:int':
        case 'xs:short':
        case 'xs:unsignedByte':
        case 'xs:unsignedInt':
        case 'xs:unsignedShort':
            return 0;
        case 'xs:long':
        case 'xs:unsignedLong':
            return BigInt(0);
        case 'xs:date':
        case 'xs:dateTime':
        case 'xs:time':
            return 0;
        case 'xs:string':
            return '';
        default:
            throw new Error(`Data type "${type}" is not supported.`);
    }
}

/**
 * Returns the value for the specified language.
 * @param value The localizable string.
 * @param localeId The locale identifier.
 * @returns The locale value.
 */
export function getLocaleValue(value?: LangString[], localeId?: string): string | undefined {
    let localeValue: string | undefined;
    if (value) {
        if (localeId) {
            const language = getLanguage(localeId);
            for (const item of value) {
                const lcid = item.language.toLowerCase();
                if (lcid === localeId || lcid === language) {
                    localeValue = item.text;
                    break;
                }
                else if (!localeValue && getLanguage(item.language) === language) {
                    localeValue = item.text;
                }
            }
        }

        if (!localeValue && value.length > 0) {
            localeValue = value[0].text;
        }
    }

    return localeValue;

    function getLanguage(value: string): string {
        return value.split('-')[0].toLowerCase();
    }

    function getRegion(value: string): string | null {
        const items = value.split('-');
        return items.length > 1 ? items[1].toLowerCase() : null;
    }
}

/**
 * Indicates whether the specified data type corresponds to `boolean`.
 * @param type The data type.
 */
export function isBooleanType(type: DataTypeDefXsd): boolean {
    return type === 'xs:boolean';
}

/**
 * Converts a locale invariant string representation of the current value into a localized.
 * @param value The locale invariant string representation of a value.
 * @param valueType The value type.
 * @param localeId The target language.
 */
export function toLocale(value: string | undefined, valueType: DataTypeDefXsd, localeId: string): string | undefined {
    if (!value) {
        return value;
    }

    switch (valueType) {
        case 'xs:float':
        case 'xs:double':
            const d = parseNumber(value);
            return Number.isNaN(d) ? undefined : d.toLocaleString(localeId);
        case 'xs:integer':
        case 'xs:int':
        case 'xs:unsignedInt':
        case 'xs:unsignedShort':
            const i = parseNumber(value);
            return Number.isNaN(i) ? undefined : i.toLocaleString(localeId);
        case 'xs:date':
        case 'xs:dateTime':
            return parseDate(value)?.toLocaleString(localeId, dateTimeFormat);
        case 'xs:unsignedLong':
        case 'xs:long':
        default:
            return value;
    }
}

/**
 * Converts a localized string representation of the current value into a locale invariant.
 * @param value The localized string representation of a value.
 * @param valueType The value type.
 * @param localeId The source language.
 */
export function toInvariant(value: string | undefined, valueType: DataTypeDefXsd, localeId: string): string | undefined {
    if (!value) {
        return value;
    }

    switch (valueType) {
        case 'xs:float':
        case 'xs:double':
            const d = parseNumber(value, localeId);
            return Number.isNaN(d) ? undefined : d.toString();
        case 'xs:integer':
        case 'xs:int':
        case 'xs:unsignedInt':
        case 'xs:unsignedShort':
            const i = parseNumber(value, localeId);
            return Number.isNaN(i) ? undefined : i.toString();
        case 'xs:date':
        case 'xs:dateTime':
        case 'xs:time':
            return parseDate(value, localeId)!.toUTCString();
        default:
            return value;
    }
}

/**
 * Indicates wether the specified value type represents a number.
 * @param valueType The current value type.
 * @returns `true` if the specified value type represents a number; otherwise, `false`.
 */
export function isNumberType(valueType: DataTypeDefXsd): boolean {
    switch (valueType) {
        case 'xs:float':
        case 'xs:double':
        case 'xs:integer':
        case 'xs:int':
        case 'xs:unsignedInt':
        case 'xs:unsignedShort':
            return true;
        default:
            return false;
    }
}

/**
 * Converts the specified value to an equivalent boolean.
 * @param value The current value.
 * @returns A boolean value.
 */
export function toBoolean(value: any): boolean {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        value = value.toLocaleLowerCase();
        if (value === 'false' || value.length === 0) {
            return false;
        }

        if (value === 'true') {
            return true;
        }

        return Number(value) !== 0 ? true : false
    }

    if (typeof value === 'number') {
        return value !== 0.0;
    }

    return false;
}

function stringToBoolean(value: string): boolean {
    return value?.toLocaleLowerCase() === 'true';
}

function stringToSByte(value: string): number | undefined {
    const b = Number(value);
    if (Number.isNaN(b) || b < -256) {
        return undefined
    }

    return b < 128 ? b : b - 256;
}

function stringToByte(value: string): number | undefined {
    const b = Number(value);
    if (Number.isNaN(b) || b < 0) {
        return undefined;
    }

    return b;
}

function toDouble(value: any, localeId?: string): number | undefined {
    if (typeof value === 'number') {
        return value;
    }

    if (typeof value === 'string') {
        if (localeId) {
            const decimalPart = Intl.NumberFormat(localeId).formatToParts(1.23).find(part => part.type === 'decimal');
            if (decimalPart) {
                value = value.replace(decimalPart.value, '.');
            }
        }

        const d = Number(value);
        if (!Number.isNaN(d)) {
            return d;
        }
    }

    if (typeof value === 'boolean') {
        return value ? 1 : 0;
    }

    if (value instanceof Date) {
        return value.getTime();
    }

    return undefined;
}

function toInteger(value: any): number | undefined {
    if (typeof value === 'number') {
        return value;
    }

    if (typeof value === 'string') {
        const d = Number.parseInt(value);
        if (!Number.isNaN(d)) {
            return d;
        }
    }

    if (typeof value === 'boolean') {
        return value ? 0 : 1;
    }

    if (value instanceof Date) {
        return value.getTime();
    }

    return undefined;
}

function toTime(value: any, localeId?: string): number | undefined {
    if (value instanceof Date) {
        return value.getTime();
    }

    if (typeof value === 'number') {
        return value;
    }

    if (typeof value === 'string') {
        parseDate(value, localeId)?.getTime();
    }

    return undefined;
}

function toBigInt(value: any): bigint | undefined {
    if (typeof value === 'bigint') {
        return value;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        try {
            return BigInt(value);
        } catch (error) {
            return undefined;
        }
    }

    return undefined;
}