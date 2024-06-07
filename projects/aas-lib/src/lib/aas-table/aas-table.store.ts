/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { Injectable, computed, signal } from '@angular/core';
import findLastIndex from 'lodash-es/findLastIndex';
import { TranslateService } from '@ngx-translate/core';
import { AASDocument } from 'common';
import { ViewMode } from '../types/view-mode';
import { AASTableRow, AASTableTree } from './aas-table-row';
import { AASTableFilter } from './aas-table.filter';

@Injectable()
export class AASTableStore {
    private readonly _selectedDocuments = signal<AASDocument[]>([]);
    private readonly _totalRows = signal<AASTableRow[]>([]);
    private readonly _rows = signal<AASTableRow[]>([]);

    public constructor(private readonly translate: TranslateService) {}

    public readonly selectedDocuments = this._selectedDocuments.asReadonly();

    public readonly filterText = signal('');

    public readonly viewMode = signal(ViewMode.List);

    public readonly rows = computed(() => {
        const rows = this._rows();
        const filterText = this.filterText();
        if (this.viewMode() === ViewMode.List && filterText) {
            const filter = new AASTableFilter(filterText, this.translate.currentLang);
            return rows.filter(row => filter.match(row.element));
        }

        return rows;
    });

    public setSelections(documents: AASDocument[]): void {
        const tree = new AASTableTree(this._totalRows());
        tree.selectedElements = documents;
        this._totalRows.set(tree.nodes);
        if (this.viewMode() === ViewMode.List) {
            this._rows.set(tree.nodes);
        } else {
            this._rows.set(tree.expanded);
        }
    }

    public toggleSelected(row: AASTableRow, altKey: boolean, shiftKey: boolean): void {
        const tree = new AASTableTree(this._totalRows());
        tree.toggleSelected(row, altKey, shiftKey);
        this._totalRows.set(tree.nodes);
        if (this.viewMode() === ViewMode.List) {
            this._rows.set(tree.nodes);
        } else {
            this._rows.set(tree.expanded);
        }

        this._selectedDocuments.set(
            this._totalRows()
                .filter(row => row.selected)
                .map(row => row.element),
        );
    }

    public toggleSelections(): void {
        const tree = new AASTableTree(this._totalRows());
        tree.toggleSelections();
        this._totalRows.set(tree.nodes);
        if (this.viewMode() === ViewMode.List) {
            this._rows.set(tree.nodes);
        } else {
            this._rows.set(tree.expanded);
        }

        this._selectedDocuments.set(
            this._totalRows()
                .filter(row => row.selected)
                .map(row => row.element),
        );
    }

    public expandRow(row: AASTableRow): void {
        const tree = new AASTableTree(this._totalRows());
        tree.expand(row);
        this._rows.set(tree.expanded);
    }

    public collapseRow(row: AASTableRow): void {
        const tree = new AASTableTree(this._totalRows());
        tree.collapse(row);
        this._rows.set(tree.expanded);
    }

    public initialize(documents: AASDocument[]): void {
        this._totalRows.set(
            this.viewMode() === ViewMode.List
                ? this.createListViewRows(this._totalRows(), documents)
                : this.createTreeViewRows(this._totalRows(), documents),
        );

        if (this.viewMode() === ViewMode.List) {
            this._rows.set(this._totalRows());
        } else {
            this._rows.set(new AASTableTree(this._totalRows()).expanded);
        }
    }

    private createListViewRows(state: AASTableRow[], documents: AASDocument[]): AASTableRow[] {
        const map = new Map(state.map(row => [`${row.endpoint}:${row.id}`, row]));
        const rows = documents.map(document => {
            const row = map.get(`${document.endpoint}:${document.id}`);
            if (row) {
                return row.element === document ? row : this.cloneWithNewDocument(row, document);
            }

            return new AASTableRow(document, -1, false, false, false, false, -1, -1, -1);
        });

        return rows;
    }

    private createTreeViewRows(state: AASTableRow[], documents: AASDocument[]): AASTableRow[] {
        const map = new Map(state.map(row => [`${row.endpoint}:${row.id}`, row]));
        const rows: AASTableRow[] = [];
        const nodes: AASDocument[] = [];
        documents.forEach(document => {
            const row = map.get(`${document.endpoint}:${document.id}`);
            if (row) {
                rows.push(row.element === document ? row : this.cloneWithNewDocument(row, document));
            } else {
                nodes.push(document);
            }
        });

        if (nodes.length > 0) {
            this.addRoot(nodes, rows);
        }

        return rows;
    }

    private addRoot(nodes: AASDocument[], rows: AASTableRow[]): AASTableRow[] {
        const root = nodes.find(node => !node.parentId);
        const index = findLastIndex(rows, row => row.level === 0);
        if (root) {
            const hasChildren = this.hasChildren(root, nodes);
            const rootRow = new AASTableRow(
                root,
                -1,
                false,
                false,
                false,
                !hasChildren,
                0,
                hasChildren ? rows.length + 1 : -1,
                -1,
            );

            const parentIndex = rows.length;
            rows.push(rootRow);

            if (index >= 0) {
                const previous = this.clone(rows[index]);
                previous.nextSibling = rows.length - 1;
                rows[index] = previous;
            }

            this.traverse(root, nodes, rows, parentIndex, 1);
        }

        return rows;
    }

    private traverse(
        parent: AASDocument,
        nodes: AASDocument[],
        rows: AASTableRow[],
        parentIndex: number,
        level: number,
    ): void {
        let previous: AASTableRow | null = null;
        for (const child of this.getChildren(parent, nodes)) {
            const row = new AASTableRow(
                child,
                parentIndex,
                false,
                false,
                false,
                !this.hasChildren(child, nodes),
                level,
                -1,
                -1,
            );

            const index = rows.length;
            rows.push(row);
            if (previous) {
                previous.nextSibling = index;
            }

            row.firstChild = rows.length;
            this.traverse(child, nodes, rows, index, level + 1);
            previous = row;
        }
    }

    private getChildren(parent: AASDocument, nodes: AASDocument[]): AASDocument[] {
        const children: AASDocument[] = [];
        for (const node of nodes) {
            if (node.parentId === parent.id) {
                children.push(node);
            }
        }

        return children;
    }

    private hasChildren(parent: AASDocument, nodes: AASDocument[]): boolean {
        for (const node of nodes) {
            if (node.parentId === parent.id) {
                return true;
            }
        }

        return false;
    }

    private clone(row: AASTableRow): AASTableRow {
        return new AASTableRow(
            row.element,
            row.parent,
            row.selected,
            row.expanded,
            row.highlighted,
            row.isLeaf,
            row.level,
            row.firstChild,
            row.nextSibling,
        );
    }

    private cloneWithNewDocument(row: AASTableRow, document: AASDocument): AASTableRow {
        return new AASTableRow(
            document,
            row.parent,
            row.selected,
            row.expanded,
            row.highlighted,
            row.isLeaf,
            row.level,
            row.firstChild,
            row.nextSibling,
        );
    }
}
