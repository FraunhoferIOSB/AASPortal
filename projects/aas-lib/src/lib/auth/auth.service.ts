/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { Injectable, computed, signal } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, catchError, from, map, mergeMap, Observable, of, throwError } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import {
    ApplicationError,
    Credentials,
    isUserAuthorized,
    stringFormat,
    UserProfile,
    UserRole,
    JWTPayload,
    toBoolean,
} from 'aas-core';

import { NotifyService } from '../notify/notify.service';
import { ERRORS } from '../types/errors';
import { LoginFormComponent, LoginFormResult } from '../auth/login-form/login-form.component';
import { ProfileFormComponent, ProfileFormResult } from '../auth/profile-form/profile-form.component';
import { RegisterFormComponent, RegisterFormResult } from '../auth/register-form/register-form.component';
import { AuthApiService } from './auth-api.service';
import { WindowService } from '../window.service';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private readonly payload$ = signal<JWTPayload>({ role: 'guest' });
    private readonly ready$ = new BehaviorSubject<boolean>(false);

    public constructor(
        private modal: NgbModal,
        private translate: TranslateService,
        private api: AuthApiService,
        private notify: NotifyService,
        private window: WindowService,
    ) {
        const stayLoggedIn = toBoolean(this.window.getLocalStorageItem('.StayLoggedIn'));
        const token = this.window.getLocalStorageItem('.Token');
        if (stayLoggedIn && token && this.isValid(token)) {
            const payload = jwtDecode(token) as JWTPayload;
            if (payload && payload.sub) {
                this.ensureLoggedInAsUser(token, payload.sub);
                return;
            }
        }

        this.loginAsGuest().subscribe({
            error: error => {
                this.notify.error(error);
                this.ready$.next(true);
            },
            complete: () => this.ready$.next(true),
        });
    }

    /** Signals that an authentication was performed. */
    public readonly ready = this.ready$.asObservable();

    /** The e-mail of the current user. */
    public readonly userId = computed(() => this.payload$()?.sub);

    /** The name or alias of the current user. */
    public readonly name = computed(() => this.payload$()?.name ?? (this.translate.instant('GUEST_USER') as string));

    /** The current user role. */
    public readonly role = computed(() => this.payload$()?.role ?? 'guest');

    /** Indicates whether the current user is authenticated. */
    public readonly authenticated = computed(() => {
        const payload = this.payload$();
        return payload.sub != null && (payload.role === 'editor' || payload.role === 'admin');
    });

    /** The current active JSON web token. */
    public readonly payload = this.payload$.asReadonly();

    /**
     * User login.
     * @param credentials The credentials.
     */
    public login(credentials?: Credentials): Observable<void> {
        if (credentials) {
            return this.api.login(credentials).pipe(map(result => this.nextPayload(result.token)));
        }

        return of(this.modal.open(LoginFormComponent, { backdrop: 'static', animation: true, keyboard: true })).pipe(
            mergeMap(modalRef => {
                const stayLoggedIn = toBoolean(this.window.getLocalStorageItem('.StayLoggedIn'));
                const token = this.window.getLocalStorageItem('.Token');
                if (stayLoggedIn && token) {
                    modalRef.componentInstance.stayLoggedIn.set(stayLoggedIn);
                }

                return from<Promise<LoginFormResult | undefined>>(modalRef.result);
            }),
            mergeMap(result => {
                if (result?.token) {
                    this.nextPayload(result.token);
                    if (result.stayLoggedIn) {
                        this.window.setLocalStorageItem('.StayLoggedIn', 'true');
                    } else if (toBoolean(this.window.getLocalStorageItem('.StayLoggedIn'))) {
                        this.window.removeLocalStorageItem('.StayLoggedIn');
                    }
                } else if (result?.action === 'register') {
                    return this.register();
                }

                return of(void 0);
            }),
        );
    }

    /**
     * Ensures that the current user has the expected rights.
     * @param role The expected user role.
     */
    public ensureAuthorized(role: UserRole): Observable<void> {
        if (this.isAuthorized(role)) {
            return of(void 0);
        }

        return this.login().pipe(
            map(() => {
                if (!this.isAuthorized(role)) {
                    throw new ApplicationError('Unauthorized access.', ERRORS.UNAUTHORIZED_ACCESS);
                }
            }),
        );
    }

    /** Logs out the current user. */
    public logout(): Observable<void> {
        if (!this.userId) {
            return throwError(() => new Error('Invalid operation.'));
        }

        return this.loginAsGuest();
    }

    /**
     * Registers a new user.
     * @param profile The profile of the new user.
     */
    public register(profile?: UserProfile): Observable<void> {
        if (profile) {
            return this.api.register(profile).pipe(map(result => this.nextPayload(result.token)));
        }

        return of(this.modal.open(RegisterFormComponent, { backdrop: 'static', animation: true, keyboard: true })).pipe(
            mergeMap(modalRef => from<Promise<RegisterFormResult | undefined>>(modalRef.result)),
            map(result => {
                if (result) {
                    this.nextPayload(result.token);
                    if (result.stayLoggedIn) {
                        this.window.setLocalStorageItem('.StayLoggedIn', 'true');
                    } else {
                        this.window.removeLocalStorageItem('.StayLoggedIn');
                    }
                }
            }),
        );
    }

    /**
     * Updates the profile of the current user.
     * @param profile The updated user profile.
     */
    public updateUserProfile(profile?: UserProfile): Observable<void> {
        const payload = this.payload$();
        if (!payload || !payload.sub || !payload.name) {
            return throwError(() => new Error('Invalid operation.'));
        }

        if (profile) {
            return this.api.updateProfile(payload.sub, profile).pipe(map(result => this.nextPayload(result.token)));
        }

        return of(this.modal.open(ProfileFormComponent, { backdrop: 'static', animation: true, keyboard: true })).pipe(
            mergeMap(form => {
                form.componentInstance.initialize({ id: payload.sub, name: payload.name });
                return from<Promise<ProfileFormResult>>(form.result);
            }),
            mergeMap(result => {
                if (result?.token) {
                    this.nextPayload(result.token);
                } else if (result?.action === 'deleteUser') {
                    const message = stringFormat(this.translate.instant('CMD_DELETE_USER'), this.userId);
                    if (this.window.confirm(message)) {
                        return this.deleteUser();
                    }
                }

                return of(void 0);
            }),
        );
    }

    /**
     * Deletes the account of the current authenticated user.
     */
    public deleteUser(): Observable<void> {
        const payload = this.payload$();
        if (!payload || !payload.sub || !payload.name) {
            throw new Error('Invalid operation');
        }

        return this.api.delete(payload.sub).pipe(mergeMap(() => this.loginAsGuest()));
    }

    /**
     * Determines whether the current user is authorized for the specified roles.
     * @param expected The expected role, the current user must have.
     */
    public isAuthorized(expected: UserRole): boolean {
        return isUserAuthorized(this.role(), expected);
    }

    /**
     * Indicates whether a cookie with the specified name exists.
     * @param name The cookie name.
     * @returns `true` if the cookie exists; otherwise, `false`.
     */
    public checkCookie(name: string): Observable<boolean> {
        const payload = this.payload$();
        if (payload && payload.sub) {
            const id = payload.sub;
            return this.api.getCookie(id, name).pipe(map(cookie => cookie != null));
        } else {
            return of(this.window.getLocalStorageItem(name) != null);
        }
    }

    /**
     * Gets the value of the cookie with the specified name.
     * @param name The cookie name.
     * @returns The cookie value.
     */
    public getCookie(name: string): Observable<string | undefined> {
        const payload = this.payload$();
        if (payload && payload.sub) {
            return this.api.getCookie(payload.sub, name).pipe(map(cookie => cookie?.data));
        }

        return of(this.window.getLocalStorageItem(name) ?? undefined);
    }

    /**
     * Sets the value of the cookie with the specified name.
     * @param name The cookie name.
     * @param data The cookie value.
     */
    public setCookie(name: string, data: string): Observable<void> {
        const payload = this.payload$();
        if (payload && payload.sub) {
            const id = payload.sub;
            return this.api.setCookie(id, { name, data });
        } else {
            this.window.setLocalStorageItem(name, data);
            return of(void 0);
        }
    }

    /**
     * Deletes the cookie with the specified name.
     * @param name The cookie name.
     */
    public deleteCookie(name: string): Observable<void> {
        const payload = this.payload$();
        if (payload && payload.sub) {
            const id = payload.sub;
            return this.api.deleteCookie(id, name);
        } else {
            this.window.removeLocalStorageItem(name);
            return of(void 0);
        }
    }

    private ensureLoggedInAsUser(token: string, id: string): void {
        this.api
            .getProfile(id)
            .pipe(
                map(() => this.nextPayload(token)),
                catchError(() => this.loginAsGuest()),
            )
            .subscribe({
                error: error => {
                    this.notify.error(error);
                    this.ready$.next(true);
                },
                complete: () => this.ready$.next(true),
            });
    }

    private loginAsGuest(): Observable<void> {
        this.window.removeLocalStorageItem('.Token');
        this.window.removeLocalStorageItem('.StayLoggedIn');
        return this.api.guest().pipe(map(result => this.nextPayload(result.token)));
    }

    private isValid(token: string): boolean {
        try {
            const value = jwtDecode(token) as JWTPayload;
            return value.exp == null || Date.now() / 1000 < value.exp;
        } catch (error) {
            return false;
        }
    }

    private nextPayload(token: string): void {
        this.window.setLocalStorageItem('.Token', token);
        const payload = jwtDecode(token) as JWTPayload;
        this.payload$.set(payload);
    }
}
