/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy,
    computed,
    effect,
    input,
    model,
    untracked,
} from '@angular/core';

import { Router } from '@angular/router';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AASDocument } from 'common';

import { AASTableRow } from './aas-table-row';
import { ClipboardService } from '../clipboard.service';
import { WindowService } from '../window.service';
import { ViewMode } from '../types/view-mode';
import { AASTableStore } from './aas-table.store';
import { MaxLengthPipe } from '../max-length.pipe';
import { AASTableFilter } from './aas-table.filter';

@Component({
    selector: 'fhg-aas-table',
    templateUrl: './aas-table.component.html',
    styleUrls: ['./aas-table.component.scss'],
    standalone: true,
    imports: [NgbTooltip, MaxLengthPipe, TranslateModule],
    providers: [AASTableStore],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AASTableComponent implements OnDestroy {
    private shiftKey = false;
    private altKey = false;

    public constructor(
        private readonly router: Router,
        private readonly store: AASTableStore,
        private readonly clipboard: ClipboardService,
        private readonly window: WindowService,
        private readonly translate: TranslateService,
    ) {
        effect(
            () => {
                this.store.initialize(this.documents(), untracked(this.viewMode));
            },
            { allowSignalWrites: true },
        );

        effect(
            () => {
                this.store.setSelected(this.selected(), untracked(this.viewMode));
            },
            { allowSignalWrites: true },
        );

        this.window.addEventListener('keyup', this.keyup);
        this.window.addEventListener('keydown', this.keydown);
    }

    public readonly viewMode = input<ViewMode>(ViewMode.List);

    public readonly documents = input<AASDocument[]>([]);

    public readonly selected = model<AASDocument[]>([]);

    public readonly filter = input('');

    public readonly rows = computed(() => {
        const rows = this.store.rows();
        const filterText = this.filter();
        if (this.viewMode() === ViewMode.List && filterText) {
            const filter = new AASTableFilter(filterText, this.translate.currentLang);
            return rows.filter(row => filter.match(row.element));
        }

        return rows;
    });

    public readonly someSelected = computed(() => {
        const rows = this.rows();
        return rows.length > 0 && rows.some(row => row.selected) && !rows.every(row => row.selected);
    });

    public readonly everySelected = computed(() => {
        const rows = this.rows();
        return rows.length > 0 && rows.every(row => row.selected);
    });

    public ngOnDestroy(): void {
        this.window.removeEventListener('keyup', this.keyup);
        this.window.removeEventListener('keydown', this.keydown);
    }

    public expand(row: AASTableRow): void {
        this.store.expandRow(row);
    }

    public collapse(row: AASTableRow): void {
        this.store.collapseRow(row);
    }

    public open(row: AASTableRow): void {
        this.clipboard.set('AASDocument', row.element);
        this.router.navigate(['/aas'], {
            skipLocationChange: true,
            queryParams: {
                id: row.id,
                endpoint: row.endpoint,
            },
        });
    }

    public getToolTip(row: AASTableRow): string {
        return `${row.endpoint}, ${row.element.address}`;
    }

    public toggleSelected(row: AASTableRow): void {
        this.selected.set(this.store.toggleSelected(row, this.altKey, this.shiftKey, this.viewMode()));
    }

    public toggleSelections(): void {
        this.selected.set(this.store.toggleSelections(this.viewMode()));
    }

    private keyup = () => {
        this.shiftKey = false;
        this.altKey = false;
    };

    private keydown = (event: KeyboardEvent) => {
        this.shiftKey = event.shiftKey;
        this.altKey = event.altKey;
    };
}
