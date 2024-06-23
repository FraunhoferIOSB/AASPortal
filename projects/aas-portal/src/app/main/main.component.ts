/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { ChangeDetectionStrategy, Component, OnInit, TemplateRef, ViewChild, model, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { first } from 'rxjs';
import { AuthComponent, LocalizeComponent, NotifyComponent, WindowService } from 'aas-lib';
import { ToolbarService } from '../toolbar.service';
import { MainApiService } from './main-api.service';
import { TranslateModule } from '@ngx-translate/core';
import { AsyncPipe, NgTemplateOutlet } from '@angular/common';

export const enum LinkId {
    START = 0,
    AAS = 1,
    VIEW = 2,
    DASHBOARD = 3,
    ABOUT = 4,
}

export interface LinkDescriptor {
    id: LinkId;
    name: string;
    url: string;
}

@Component({
    selector: 'fhg-main',
    templateUrl: './main.component.html',
    styleUrls: ['./main.component.scss'],
    standalone: true,
    imports: [
        RouterOutlet,
        RouterLink,
        AsyncPipe,
        NgbNavModule,
        NgTemplateOutlet,
        TranslateModule,
        NotifyComponent,
        LocalizeComponent,
        AuthComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainComponent implements OnInit {
    public constructor(
        private readonly router: Router,
        private readonly window: WindowService,
        private readonly api: MainApiService,
        private readonly toolbar: ToolbarService,
    ) {}

    @ViewChild('emptyToolbar', { read: TemplateRef })
    public emptyToolbar!: TemplateRef<unknown>;

    public readonly toolbarTemplate = this.toolbar.toolbarTemplate;

    public readonly activeId = model(LinkId.START);

    public readonly links = signal<LinkDescriptor[]>([
        {
            id: LinkId.START,
            name: 'CAPTION_START',
            url: '/start',
        },
        {
            id: LinkId.AAS,
            name: 'CAPTION_AAS',
            url: '/aas',
        },
        {
            id: LinkId.VIEW,
            name: 'CAPTION_VIEW',
            url: '/view',
        },
        {
            id: LinkId.DASHBOARD,
            name: 'CAPTION_DASHBOARD',
            url: '/dashboard',
        },
        {
            id: LinkId.ABOUT,
            name: 'CAPTION_ABOUT',
            url: '/about',
        },
    ]).asReadonly();

    public ngOnInit(): void {
        const params = this.window.getQueryParams();
        const id = params.get('id');
        if (id) {
            this.api
                .getDocument(id)
                .pipe(first())
                .subscribe(document => {
                    if (document) {
                        this.router.navigate(['/aas'], {
                            skipLocationChange: true,
                            queryParams: { id: document.id, endpoint: document.endpoint },
                        });
                    } else {
                        this.router.navigate(['/start'], { skipLocationChange: true });
                    }
                });
        } else {
            this.router.navigate(['/start'], { skipLocationChange: true });
        }
    }
}
