/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Observable, of } from 'rxjs';
import { AuthService, DownloadService, NotifyService, OnlineState } from 'aas-lib';
import { CommonModule } from '@angular/common';

import { AASDocument, aas, noop } from 'common';
import { AASComponent } from '../../app/aas/aas.component';
import { rotationSpeed, sampleDocument, torque } from '../assets/sample-document';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DashboardPage, DashboardService } from '../../app/dashboard/dashboard.service';
import { DashboardChartType } from '../../app/dashboard/dashboard.service';
import { Router } from '@angular/router';
import { AppRoutingModule } from '../../app/app-routing.module';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AASApiService } from '../../app/aas/aas-api.service';
import { ToolbarService } from '../../app/toolbar.service';
import { AASStoreService } from '../../app/aas/aas-store.service';

@Component({
    selector: 'fhg-aas-tree',
    template: '<div></div>',
    styleUrls: [],
})
class TestAASTreeComponent {
    @Input()
    public document: AASDocument | null = null;
    @Input()
    public state: OnlineState | null = 'offline';
    @Input()
    public search: Observable<string> | null = null;
    @Input()
    public selected: aas.Referable[] = [torque, rotationSpeed];
    @Output()
    public selectedChange = new EventEmitter<aas.Referable[]>();

    public findNext(): void {
        noop();
    }

    public findPrevious(): void {
        noop();
    }
}

@Component({
    selector: 'fhg-img',
    template: '<div></div>',
    styleUrls: [],
})
class TestSecureImageComponent {
    @Input()
    public src = '';
    @Input()
    public alt?: string;
    @Input()
    public classname?: string;
    @Input()
    public width = -1;
    @Input()
    public height = -1;
}

describe('AASComponent', () => {
    let component: AASComponent;
    let fixture: ComponentFixture<AASComponent>;
    let dashboard: jasmine.SpyObj<DashboardService>;
    let router: Router;
    let store: AASStoreService;
    let api: jasmine.SpyObj<AASApiService>;
    let download: jasmine.SpyObj<DownloadService>;
    let pages: DashboardPage[];

    beforeEach(() => {
        pages = [{ name: 'Dashboard 1', items: [], requests: [] }];

        api = jasmine.createSpyObj<AASApiService>(['getDocument', 'putDocument']);
        download = jasmine.createSpyObj<DownloadService>(['downloadDocument', 'downloadFileAsync', 'uploadDocuments']);
        dashboard = jasmine.createSpyObj<DashboardService>(['add'], {
            activePage: of(pages[0]),
            pages: pages,
        });

        TestBed.configureTestingModule({
            declarations: [AASComponent, TestAASTreeComponent, TestSecureImageComponent],
            providers: [
                {
                    provide: AASApiService,
                    useValue: api,
                },
                {
                    provide: NotifyService,
                    useValue: jasmine.createSpyObj<NotifyService>(['error']),
                },
                {
                    provide: DashboardService,
                    useValue: dashboard,
                },
                {
                    provide: DownloadService,
                    useValue: download,
                },
                {
                    provide: ToolbarService,
                    useValue: jasmine.createSpyObj<ToolbarService>(['clear', 'set']),
                },
                {
                    provide: AuthService,
                    useValue: jasmine.createSpyObj<AuthService>(['ensureAuthorized']),
                },
            ],
            imports: [
                CommonModule,
                AppRoutingModule,
                HttpClientTestingModule,
                NgbModule,
                TranslateModule.forRoot({
                    loader: {
                        provide: TranslateLoader,
                        useClass: TranslateFakeLoader,
                    },
                }),
            ],
        });

        fixture = TestBed.createComponent(AASComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(AASStoreService);
        router = TestBed.inject(Router);
        store.setDocument(sampleDocument);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('shows the document address', () => {
        expect(component.address).toEqual(sampleDocument.address);
    });

    it('shows the document assetId', () => {
        expect(component.assetId).toEqual('http://customer.com/assets/KHBVZJSQKIY');
    });

    it('shows the document id', () => {
        expect(component.id).toEqual(sampleDocument.id);
    });

    it('shows the document version', () => {
        expect(component.version).toEqual('-');
    });

    it('indicates that "play" is disabled while sample AAS is not online ready', () => {
        expect(component.canPlay).toBeFalse();
    });

    it('indicates that "stop" is disabled while sample AAS is not online ready', () => {
        expect(component.canStop).toBeFalse();
    });

    it('indicates that the sample AAS is editable', () => {
        expect(component.readOnly).toBeFalse();
    });

    describe('canAddToDashboard', () => {
        beforeEach(() => {
            component.selectedElements = [torque, rotationSpeed];
        });

        it('can add the selected properties to the dashboard', () => {
            spyOn(router, 'navigateByUrl').and.resolveTo(true);
            expect(component.canAddToDashboard).toBeTrue();
            component.addToDashboard(DashboardChartType.BarVertical);
            expect(dashboard.add).toHaveBeenCalled();
            expect(router.navigateByUrl).toHaveBeenCalled();
        });
    });
});
