/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { TestBed } from '@angular/core/testing';
import { aas, AASDocument, selectElement } from 'common';
import cloneDeep from 'lodash-es/cloneDeep';
import { NotifyService } from 'aas-lib';
import { aasNoTechnicalData, submodelTechnicalData } from '../../test/assets/sample-document';
import { NewElementCommand } from '../../app/aas/commands/new-element-command';
import { AASStoreService } from '../../app/aas/aas-store.service';
import { AASApiService } from '../../app/aas/aas-api.service';

describe('NewElementCommand', function () {
    let command: NewElementCommand;
    let document: AASDocument;
    let submodel: aas.Submodel;
    let store: AASStoreService;

    beforeEach(function () {
        document = cloneDeep(aasNoTechnicalData);
        submodel = cloneDeep(submodelTechnicalData);

        TestBed.configureTestingModule({
            providers: [
                {
                    provide: NotifyService,
                    useValue: jasmine.createSpyObj<NotifyService>(['error']),
                },
                {
                    provide: AASApiService,
                    useValue: jasmine.createSpyObj<AASApiService>(['getContent', 'getDocument', 'putDocument']),
                },
            ],
        });

        store = TestBed.inject(AASStoreService);
        store.setDocument(document);
    });

    beforeEach(function () {
        command = new NewElementCommand(store, document, document.content!.assetAdministrationShells[0], submodel);
        command.execute();
    });

    it('can be executed', () => {
        const document = store.document();
        const element = selectElement(document!.content!, 'TechnicalData');
        expect(element).toBeDefined();
    });

    it('can be undone/redone', () => {
        {
            command.undo();
            const document = store.document();
            const element = selectElement(document!.content!, 'TechnicalData');
            expect(element).toBeUndefined();
        }

        {
            command.redo();
            const document = store.document();
            const element = selectElement(document!.content!, 'TechnicalData');
            expect(element).toBeDefined();
        }
    });
});
