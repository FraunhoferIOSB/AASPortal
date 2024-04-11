import { AASDocument, aas, isEntity, isRelationshipElement, selectReferable } from 'common';
import { AASIndex } from '../aas-index/aas-index.js';

export type ArcheType = 'Full' | 'OneDown' | 'OneUp';

export abstract class HierarchicalStructureElement {
    protected getProperty(
        submodelElements: aas.SubmodelElement[] | undefined,
        semanticId: string,
    ): aas.Property | undefined {
        return submodelElements?.find(
            element =>
                element.modelType === 'Property' &&
                HierarchicalStructureElement.getSemanticId(element.semanticId) === semanticId,
        ) as aas.Property;
    }

    protected getEntity(
        submodelElements: aas.SubmodelElement[] | undefined,
        semanticId: string,
    ): aas.Entity | undefined {
        return submodelElements?.find(
            element =>
                element.modelType === 'Entity' &&
                HierarchicalStructureElement.getSemanticId(element.semanticId) === semanticId,
        ) as aas.Entity;
    }

    protected getRelationship(
        submodelElements: aas.SubmodelElement[] | undefined,
        semanticId: string,
    ): aas.RelationshipElement | undefined {
        return submodelElements?.find(
            element =>
                element.modelType === 'RelationshipElement' &&
                HierarchicalStructureElement.getSemanticId(element.semanticId) === semanticId,
        ) as aas.RelationshipElement;
    }

    protected static getSemanticId(reference: aas.Reference | undefined): string | undefined {
        return reference && reference.keys.length > 0 ? reference.keys[0].value : undefined;
    }
}

export class HierarchicalStructure extends HierarchicalStructureElement {
    public constructor(
        private readonly document: AASDocument,
        private readonly env: aas.Environment,
        private readonly submodel: aas.Submodel,
    ) {
        super();

        this.archeType = this.initArcheType();
        this.entryNode = this.initEntryNode();
    }

    public readonly archeType: ArcheType;

    public readonly entryNode: aas.Entity;

    public static isHierarchicalStructure(submodel: aas.Submodel): boolean {
        return (
            HierarchicalStructureElement.getSemanticId(submodel.semanticId) ===
            'https://admin-shell.io/idta/HierarchicalStructures/1/0/Submodel'
        );
    }

    public async getChildren(): Promise<string[]> {
        if (this.archeType !== 'OneDown') {
            return [];
        }

        const children: string[] = [];
        for (const hasPart of this.getHasParts(this.entryNode)) {
            const first = selectReferable(this.env, hasPart.first);
            const second = selectReferable(this.env, hasPart.second);
            if (isEntity(first) && isEntity(second)) {
                let globalAssetId: string | undefined;
                if (this.isNode(first)) {
                    globalAssetId = first.globalAssetId;
                } else if (this.isNode(second)) {
                    globalAssetId = second.globalAssetId;
                }

                if (globalAssetId) {
                    children.push(globalAssetId);
                }
            }
        }

        return children;
    }

    private initArcheType(): ArcheType {
        const property = this.getProperty(
            this.submodel.submodelElements,
            'https://admin-shell.io/idta/HierarchicalStructures/ArcheType/1/0',
        );

        if (!property || !property.value) {
            throw new Error('Missing ArcheType Property.');
        }

        return property.value as ArcheType;
    }

    private initEntryNode(): aas.Entity {
        const entity = this.getEntity(
            this.submodel.submodelElements,
            'https://admin-shell.io/idta/HierarchicalStructures/EntryNode/1/0',
        );

        if (!entity) {
            throw new Error('Missing EntryNode Entity.');
        }

        return entity;
    }

    private getHasParts(node: aas.Entity): aas.RelationshipElement[] {
        if (!node.statements) {
            return [];
        }

        const hasParts: aas.RelationshipElement[] = [];
        for (const statement of node.statements) {
            if (
                isRelationshipElement(statement) &&
                HierarchicalStructureElement.getSemanticId(statement.semanticId) ===
                    'https://admin-shell.io/idta/HierarchicalStructures/HasPart/1/0'
            ) {
                hasParts.push(statement);
            }
        }

        return hasParts;
    }

    private getBulkCount(node: aas.Entity): number {
        const property = this.getProperty(
            node.statements,
            'https://admin-shell.io/idta/HierarchicalStructures/BulkCount/1/0',
        );

        if (!property || !property.value) {
            throw new Error('Missing BulkCount Property.');
        }

        return Number(property.value);
    }

    private isNode(entity: aas.Entity): boolean {
        return (
            HierarchicalStructureElement.getSemanticId(entity.semanticId) ===
            'https://admin-shell.io/idta/HierarchicalStructures/Node/1/0'
        );
    }
}
