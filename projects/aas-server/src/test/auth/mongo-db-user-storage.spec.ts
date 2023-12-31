/******************************************************************************
 *
 * Copyright (c) 2019-2023 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import 'reflect-metadata';
import { MongoDBUserStorage } from '../../app/auth/mongo-db-user-storage.js';
import { UserData } from '../../app/auth/user-data.js';
import { describe, beforeAll, beforeEach, it, expect, jest } from '@jest/globals';

interface UserDataInstance extends UserData {
    save(): Promise<void>;
}

interface Promisify {
    exec(): Promise<UserDataInstance | undefined>;
}

describe('MongoDBUserStorage', function () {
    let userStorage: MongoDBUserStorage;
    let johnDoe: UserData;

    beforeAll(function () {
        userStorage = new MongoDBUserStorage();
    });

    beforeEach(function () {
        johnDoe = {
            id: "john.doe@email.com",
            name: "John Doe",
            role: "editor",
            password: "$2a$10$6qZT2ZM5jUVU/pLLQUjCvuXplG.GwPnoz48C1Eg/dKqjIrGE8jm0a",
            created: new Date(),
            lastLoggedIn: new Date(0)
        };
    });

    it('indicates that john.doe@email.com exists', async function () {
        jest.spyOn(userStorage.UserDataModel, 'findOne').mockReturnValue(getPromisify(johnDoe));
        await expect(userStorage.existAsync('john.doe@email.com')).resolves.toBe(true);
    });

    it('indicates that unknown@email.com does not exist', async function () {
        jest.spyOn(userStorage.UserDataModel, 'findOne').mockReturnValue(getPromisify());
        await expect(userStorage.existAsync('unknown@email.com')).resolves.toBe(false);
    });

    it('reads the data of john.doe@email.com', async function () {
        jest.spyOn(userStorage.UserDataModel, 'findOne').mockReturnValue(getPromisify(johnDoe));
        let user = (await userStorage.readAsync('john.doe@email.com'))!;
        expect(user).toBeDefined();
        expect(user.id).toEqual(johnDoe.id);
        expect(user.name).toEqual(johnDoe.name);
        expect(user.role).toEqual(johnDoe.role);
        expect(user.password).toEqual(johnDoe.password);
    });

    it('reads "undefined" for an unknown user', async function () {
        jest.spyOn(userStorage.UserDataModel, 'findOne').mockReturnValue(getPromisify());
        await expect(userStorage.readAsync('unknown@email.com')).resolves.toBe(undefined);
    });

    it('updates the data of john.doe@email.com', async function () {
        let save = jest.fn<() => Promise<void>>();
        jest.spyOn(userStorage.UserDataModel, 'findOne').mockReturnValue(getPromisify(johnDoe, save));
        await userStorage.writeAsync('john.doe@email.com', { ...johnDoe });
        expect(save).toHaveBeenCalled
    });

    it('deletes john.doe@email.com', async function () {
        jest.spyOn(userStorage.UserDataModel, 'findOneAndRemove').mockReturnValue(getPromisify(johnDoe));
        await expect(userStorage.deleteAsync('john.doe@email.com')).resolves.toBe(true);
    });

    function getPromisify(user?: UserData, save?: () => Promise<void>): any {
        if (user) {
            return {
                exec: () => new Promise<UserDataInstance | undefined>((resolve, _) => resolve(getInstance(user, save)))
            } as Promisify;
        }

        return {
            exec: () => new Promise<UserDataInstance | undefined>((resolve, _) => resolve(undefined))
        } as Promisify;
    }

    function getInstance(user: UserData, save?: () => Promise<void>): UserDataInstance {
        return {
            ...user,
            save: save ?? (() => new Promise<void>((result, _) => result()))
        }
    }
});