/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { NgClass, NgStyle } from '@angular/common';
import { Router } from '@angular/router';
import { BehaviorSubject, Subscription } from 'rxjs';
import { WebSocketSubject } from 'rxjs/webSocket';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, input, output } from '@angular/core';

import {
    aas,
    LiveNode,
    LiveRequest,
    WebSocketData,
    AASDocument,
    convertToString,
    toLocale,
    selectSubmodel,
    getIdShortPath,
    mimeTypeToExtension,
    selectReferable,
    stringFormat,
} from 'aas-core';

import { AASTreeRow } from './aas-tree-row';
import { OnlineState } from '../types/online-state';
import { ShowImageFormComponent } from './show-image-form/show-image-form.component';
import { ShowVideoFormComponent } from './show-video-form/show-video-form.component';
import { OperationCallFormComponent } from './operation-call-form/operation-call-form.component';
import { AASTreeSearch } from './aas-tree-search';
import { basename, encodeBase64Url } from '../convert';
import { ViewQuery } from '../types/view-query-params';
import { WindowService } from '../window.service';
import { DocumentService } from '../document.service';
import { DownloadService } from '../download.service';
import { WebSocketFactoryService } from '../web-socket-factory.service';
import { ClipboardService } from '../clipboard.service';
import { LogType, NotifyService } from '../notify/notify.service';
import {
    SubmodelViewDescriptor,
    resolveSemanticId,
    supportedSubmodelTemplates,
} from '../submodel-template/submodel-template';

import { AASTreeApiService } from './aas-tree-api.service';
import { AASTreeStore } from './aas-tree.store';

interface PropertyValue {
    property: aas.Property;
    value: BehaviorSubject<string | boolean>;
}

@Component({
    selector: 'fhg-aas-tree',
    templateUrl: './aas-tree.component.html',
    styleUrls: ['./aas-tree.component.scss'],
    standalone: true,
    imports: [NgClass, NgStyle, TranslateModule],
    providers: [AASTreeSearch, AASTreeStore],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AASTreeComponent implements OnInit, OnDestroy {
    private readonly liveNodes: LiveNode[] = [];
    private readonly map = new Map<string, PropertyValue>();
    private readonly subscription = new Subscription();
    private shiftKey = false;
    private altKey = false;

    private webSocketSubject?: WebSocketSubject<WebSocketData>;

    public constructor(
        private readonly store: AASTreeStore,
        private readonly router: Router,
        private readonly api: AASTreeApiService,
        private readonly searching: AASTreeSearch,
        private readonly modal: NgbModal,
        private readonly window: WindowService,
        private readonly dom: DocumentService,
        private readonly download: DownloadService,
        private readonly translate: TranslateService,
        private readonly notify: NotifyService,
        private readonly webSocketFactory: WebSocketFactoryService,
        private readonly clipboard: ClipboardService,
    ) {
        effect(() => this.searching.start(this.searchExpression()), { allowSignalWrites: true });

        effect(() => this.store.updateRows(this.document()), { allowSignalWrites: true });

        effect(() => {
            if (this.state() === 'online') {
                this.goOnline();
            } else {
                this.goOffline();
            }
        });

        effect(() => this.selected.emit(this.store.selectedElements()));

        effect(
            () => {
                const matchIndex = this.store.matchIndex();
                if (matchIndex >= 0) {
                    this.store.expandRow(matchIndex);
                }
            },
            { allowSignalWrites: true },
        );

        effect(
            () => {
                const row = this.store.matchRow();
                if (!row) return;

                setTimeout(() => {
                    const element = this.dom.getElementById(row.id);
                    element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                });
            },
            { allowSignalWrites: true },
        );

        this.window.addEventListener('keyup', this.keyup);
        this.window.addEventListener('keydown', this.keydown);
    }

    public readonly document = input<AASDocument | null>(null);

    public readonly state = input<OnlineState>('offline');

    public readonly searchExpression = input<string>('');

    public readonly selected = output<aas.Referable[]>();

    public readonly onlineReady = computed(() => this.document()?.onlineReady ?? false);

    public readonly readonly = computed(() => this.document()?.readonly ?? true);

    public readonly modified = computed(() => this.document()?.modified ?? false);

    public readonly someSelected = computed(() => {
        const rows = this.store.rows();
        return rows.length > 0 && rows.some(row => row.selected) && !rows.every(row => row.selected);
    });

    public readonly everySelected = computed(() => {
        const rows = this.store.rows();
        return rows.length > 0 && rows.every(row => row.selected);
    });

    public readonly nodes = this.store.nodes;

    public readonly rows = this.store.rows;

    public readonly matchIndex = this.store.matchIndex;

    public readonly matchRow = this.store.matchRow;

    public readonly message = computed(() => {
        const document = this.document();
        if (document) {
            if (document.content) {
                return '';
            }

            return stringFormat(
                this.translate.instant('INFO_AAS_OFFLINE'),
                new Date(document.timestamp).toLocaleString(this.translate.currentLang),
            );
        }

        return this.translate.instant('INFO_NO_SHELL_AVAILABLE');
    });

    public ngOnInit(): void {
        this.subscription.add(
            this.translate.onLangChange.subscribe(() => {
                this.store.updateRows(this.document());
            }),
        );
    }

    public ngOnDestroy(): void {
        this.subscription.unsubscribe();
        this.webSocketSubject?.unsubscribe();
        this.window.removeEventListener('keyup', this.keyup);
        this.window.removeEventListener('keydown', this.keydown);
    }

    public visualState(node: AASTreeRow): string {
        let state = '';
        if (node.selected) {
            state = 'table-primary';
            if (node.highlighted) {
                state += ' table-success';
            }
        } else if (node.highlighted) {
            state = 'table-success';
        }

        return state;
    }

    public getValue(node: AASTreeRow): string | boolean | undefined {
        if (this.state() === 'online' && node.element.modelType === 'Property') {
            const property = node.element as aas.Property;
            let value: string | boolean;
            const item = property.nodeId && this.map.get(property.nodeId);
            if (item) {
                value = item.value.getValue();
            } else {
                value = this.getPropertyValue(property);
            }

            return value;
        } else {
            return node.value;
        }
    }

    public expand(node: AASTreeRow): void {
        if (!node.expanded) {
            this.store.expandRow(node);
        }
    }

    public collapse(node?: AASTreeRow): void {
        if (node) {
            if (node.expanded) {
                this.store.collapseRow(node);
            }
        } else {
            this.store.collapse();
        }
    }

    public toggleSelections(): void {
        this.store.toggleSelections();
    }

    public toggleSelection(node: AASTreeRow): void {
        this.store.toggleSelected(node, this.altKey, this.shiftKey);
    }

    public async openFile(file: aas.File | undefined): Promise<void> {
        if (!file || !file.value || this.state() === 'online') return;

        const { name, url } = this.resolveFile(file);
        if (name && url) {
            if (file.contentType.startsWith('image/')) {
                await this.showImageAsync(name, url);
            } else if (file.contentType.startsWith('video/')) {
                await this.showVideoAsync(name, url);
            } else if (file.contentType.endsWith('/pdf')) {
                const token = await this.api.getTokenAsync(url);
                this.window.open(url + '?access_token=' + token);
            } else if (file) {
                await this.downloadFileAsync(name, url);
            }
        }
    }

    public async openBlob(blob: aas.Blob | undefined): Promise<void> {
        const document = this.document();
        if (!blob || !document || !blob.parent || this.state() === 'online') return;

        let name = blob.idShort;
        const extension = mimeTypeToExtension(blob.contentType);
        if (extension) {
            name += extension;
        }

        if (!blob.value) {
            try {
                blob.value = await this.api.getValueAsync(
                    document.endpoint,
                    document.id,
                    blob.parent.keys[0].value,
                    getIdShortPath(blob),
                );
            } catch (error) {
                this.notify.error(error);
                return;
            }
        }

        if (blob.contentType.startsWith('image/')) {
            await this.showImageAsync(name, `data:${blob.contentType};base64,${blob.value}`);
        } else if (blob.contentType.startsWith('video/')) {
            await this.showVideoAsync(name, `data:${blob.contentType};base64,${blob.value}`);
        }
    }

    public async openOperation(operation: aas.Operation | undefined): Promise<void> {
        if (!operation || this.state() === 'online') {
            return;
        }

        try {
            if (operation) {
                const modalRef = this.modal.open(OperationCallFormComponent, { backdrop: 'static' });
                modalRef.componentInstance.initialize(this.document, operation);
                await modalRef.result;
            }
        } catch (error) {
            if (error) {
                this.notify.error(error);
            }
        }
    }

    public openReference(reference: aas.Reference | string | undefined): void {
        if (!reference || this.state() === 'online') return;

        if (typeof reference === 'string') {
            this.openDocumentByAssetId(reference);
        } else {
            if (reference.keys.length === 0) {
                return;
            }

            if (reference.type === 'ExternalReference') {
                this.openExternalReference(reference);
            } else {
                this.selectModelReference(reference);
            }
        }
    }

    public openSubmodel(submodel: aas.Submodel | undefined): void {
        if (!submodel || this.state() === 'online') return;

        const semanticId = resolveSemanticId(submodel);
        if (semanticId) {
            const document = this.document();
            const template = supportedSubmodelTemplates.get(semanticId);
            if (template && document) {
                const descriptor: SubmodelViewDescriptor = {
                    template,
                    submodels: [
                        {
                            id: document.id,
                            endpoint: document.endpoint,
                            idShort: submodel.idShort,
                        },
                    ],
                };

                this.clipboard.set('ViewQuery', { descriptor } as ViewQuery);
                this.router.navigateByUrl('/view?format=ViewQuery', { skipLocationChange: true });
            }
        }
    }

    public findNext(): void {
        this.searching.findNext();
    }

    public findPrevious(): void {
        this.searching.findPrevious();
    }

    public toString(value: aas.Reference | undefined): string {
        if (!value) {
            return '-';
        }

        return value.keys.map(key => key.value).join('.');
    }

    private async showImageAsync(name: string, src: string): Promise<void> {
        try {
            const modalRef = this.modal.open(ShowImageFormComponent, { backdrop: 'static' });
            modalRef.componentInstance.initialize(name, src);
            await modalRef.result;
        } catch (error) {
            if (error) {
                this.notify.error(error);
            }
        }
    }

    private async showVideoAsync(name: string, src: string): Promise<void> {
        try {
            const modalRef = this.modal.open(ShowVideoFormComponent, { backdrop: 'static' });
            modalRef.componentInstance.initialize(name, src);
            await modalRef.result;
        } catch (error) {
            if (error) {
                this.notify.error(error);
            }
        }
    }

    private async downloadFileAsync(name: string, url: string): Promise<void> {
        try {
            this.download.downloadFileAsync(url, name);
        } catch (error) {
            this.notify.error(error);
        }
    }

    private getPropertyValue(property: aas.Property): string | boolean {
        if (typeof property.value === 'boolean') {
            return property.value;
        } else {
            return toLocale(property.value, property.valueType, this.translate.currentLang) ?? '-';
        }
    }

    private goOnline(): void {
        try {
            this.prepareOnline(this.store.rows().filter(row => row.selected));
            this.play();
        } catch (error) {
            this.stop();
        }
    }

    private goOffline(): void {
        this.stop();
    }

    private play(): void {
        const document = this.document();
        if (document) {
            this.webSocketSubject = this.webSocketFactory.create();
            this.webSocketSubject.subscribe({
                next: this.onMessage,
                error: this.onError,
            });

            this.webSocketSubject.next(this.createMessage(document));
        }
    }

    private stop(): void {
        if (this.webSocketSubject) {
            this.webSocketSubject.unsubscribe();
            this.webSocketSubject = undefined;
        }
    }

    private prepareOnline(rows: AASTreeRow[]): void {
        this.liveNodes.splice(0, this.liveNodes.length);
        this.map.clear();
        for (const row of rows) {
            if (row.selected) {
                const property = row.element as aas.Property;
                if (property.nodeId) {
                    this.liveNodes.push({
                        nodeId: property.nodeId,
                        valueType: property.valueType ?? 'undefined',
                    });

                    const subject = new BehaviorSubject<string | boolean>(this.getPropertyValue(property));
                    this.map.set(property.nodeId, { property: property, value: subject });
                }
            }
        }
    }

    private openDocumentByAssetId(assetId: string): void {
        if (assetId) {
            this.clipboard.clear('AASDocument');
            this.router.navigate(['/aas'], {
                skipLocationChange: true,
                onSameUrlNavigation: 'reload',
                queryParams: { id: assetId },
            });
        }
    }

    private openExternalReference(reference: aas.Reference): void {
        this.clipboard.clear('AASDocument');
        this.router.navigate(['/aas'], {
            skipLocationChange: true,
            onSameUrlNavigation: 'reload',
            queryParams: { id: reference.keys[0].value },
        });
    }

    private selectModelReference(reference: aas.Reference): void {
        const content = this.document()?.content;
        if (!content) {
            return;
        }

        const referable = selectReferable(content, reference);
        if (referable) {
            this.searching.find(referable);
        } else if (reference.keys[0].type === 'AssetAdministrationShell') {
            this.clipboard.clear('AASDocument');
            this.router.navigate(['/aas'], {
                skipLocationChange: true,
                onSameUrlNavigation: 'reload',
                queryParams: { id: reference.keys[0].value },
            });
        }
    }

    private createMessage(document: AASDocument): WebSocketData {
        return {
            type: 'LiveRequest',
            data: { endpoint: document.endpoint, id: document.id, nodes: this.liveNodes } as LiveRequest,
        };
    }

    private onMessage = (data: WebSocketData): void => {
        if (data.type === 'LiveNode[]') {
            for (const node of data.data as LiveNode[]) {
                const item = this.map.get(node.nodeId);
                if (item) {
                    item.value.next(
                        typeof node.value === 'boolean'
                            ? node.value
                            : convertToString(node.value, this.translate.currentLang),
                    );
                }
            }
        }
    };

    private onError = (error: unknown): void => {
        this.notify.log(LogType.Error, error);
    };

    private keyup = () => {
        this.shiftKey = false;
        this.altKey = false;
    };

    private keydown = (event: KeyboardEvent) => {
        this.shiftKey = event.shiftKey;
        this.altKey = event.altKey;
    };

    private resolveFile(file: aas.File): { url?: string; name?: string } {
        const value: { url?: string; name?: string } = {};
        const document = this.document();
        if (document?.content && file.value) {
            const submodel = selectSubmodel(document.content, file);
            if (submodel) {
                const smId = encodeBase64Url(submodel.id);
                const path = getIdShortPath(file);
                value.name = basename(file.value);
                const name = encodeBase64Url(document.endpoint);
                const id = encodeBase64Url(document.id);
                value.url = `/api/v1/containers/${name}/documents/${id}/submodels/${smId}/submodel-elements/${path}/value`;
            }
        }

        return value;
    }
}
