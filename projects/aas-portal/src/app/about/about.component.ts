/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import {
    Component,
    OnDestroy,
    OnInit,
    TemplateRef,
    ViewChild,
    AfterViewInit,
    signal,
    ChangeDetectionStrategy,
} from '@angular/core';
import { Library, Message } from 'aas-core';
import { LicenseInfoComponent, MessageTableComponent } from 'aas-lib';
import { AboutApiService } from './about-api.service';
import { ToolbarService } from '../toolbar.service';
import { environment } from '../../environments/environment';

@Component({
    selector: 'fhg-about',
    templateUrl: './about.component.html',
    styleUrls: ['./about.component.scss'],
    standalone: true,
    imports: [LicenseInfoComponent, MessageTableComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent implements OnInit, OnDestroy, AfterViewInit {
    private readonly _serverVersion = signal('');
    private readonly _libraries = signal<Library[]>([]);
    private readonly _messages = signal<Message[]>([]);

    public constructor(
        private api: AboutApiService,
        private toolbar: ToolbarService,
    ) {}

    @ViewChild('aasToolbar', { read: TemplateRef })
    public aboutToolbar: TemplateRef<unknown> | null = null;

    public readonly author = signal(environment.author).asReadonly();

    public readonly homepage = signal(environment.homepage).asReadonly();

    public readonly libraries = this._libraries.asReadonly();

    public readonly messages = this._messages.asReadonly();

    public ngOnInit(): void {
        this.api.getInfo().subscribe(info => {
            this._serverVersion.set(info.version);
            this._libraries.set(info.libraries ?? []);
        });

        this.api.getMessages().subscribe(messages => this._messages.set(messages));
    }

    public ngAfterViewInit(): void {
        if (this.aboutToolbar) {
            this.toolbar.set(this.aboutToolbar);
        }
    }

    public ngOnDestroy(): void {
        this.toolbar.clear();
    }
}
