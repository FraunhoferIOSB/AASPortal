/******************************************************************************
 *
 * Copyright (c) 2019-2024 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { aas, getLocaleValue, getPreferredName } from 'common';
import { Subscription } from 'rxjs';
import { DocumentSubmodelPair, SubmodelTemplate } from '../submodel-template/submodel-template';
import { ScoreComponent } from '../score/score.component';
import { DecimalPipe } from '@angular/common';

export interface GeneralItem {
    name: string;
    score: number;
    sum: number;
    count: number;
    like: boolean;
}

export interface FeedbackItem {
    stars: string[];
    createdAt: string;
    subject: string;
    message: string;
}

@Component({
    selector: 'fhg-customer-feedback',
    templateUrl: './customer-feedback.component.html',
    styleUrls: ['./customer-feedback.component.scss'],
    standalone: true,
    imports: [ScoreComponent, DecimalPipe],
})
export class CustomerFeedbackComponent implements SubmodelTemplate, OnInit, OnChanges, OnDestroy {
    private static readonly maxStars = 5;
    private readonly map = new Map<string, GeneralItem>();
    private readonly subscription = new Subscription();

    public constructor(private readonly translate: TranslateService) {}

    @Input()
    public submodels: DocumentSubmodelPair[] | null = null;

    public get name(): string {
        let value: string | undefined;
        if (this.submodels) {
            const names = this.submodels.map(
                item =>
                    getLocaleValue(
                        getPreferredName(item.document.content!, item.submodel),
                        this.translate.currentLang,
                    ) ?? item.submodel.idShort,
            );

            if (names.length <= 2) {
                value = names.join(', ');
            } else {
                value = `${names[0]}, ..., ${names[names.length - 1]} (${names.length})`;
            }
        }

        return value ?? '';
    }

    public stars = 0.0;

    public count = 0;

    public items: GeneralItem[] = [];

    public feedbacks: FeedbackItem[] = [];

    public starClassNames: string[] = [];

    public ngOnInit(): void {
        this.subscription.add(
            this.translate.onLangChange.subscribe(() => {
                this.init();
            }),
        );
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes['submodels']) {
            this.init();
        }
    }

    public ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    private init(): void {
        this.map.clear();
        let count = 0;
        let stars = 0.0;
        const items: GeneralItem[] = [];
        const feedbacks: FeedbackItem[] = [];
        let starClassNames: string[] | undefined;
        let sumStars = 0;
        if (this.submodels) {
            for (const pair of this.submodels) {
                if (pair.submodel.submodelElements) {
                    for (const feedback of pair.submodel.submodelElements.filter(
                        item => item.modelType === 'SubmodelElementCollection',
                    )) {
                        const general = (feedback as aas.SubmodelElementCollection).value?.find(
                            item => item.modelType === 'SubmodelElementCollection' && item.idShort === 'General',
                        );

                        if (general) {
                            sumStars += this.getStars(feedback);
                            this.buildItems(general, items);
                            ++count;
                        }

                        feedbacks.push({
                            stars: this.initStarClassNames(this.getStars(feedback)),
                            createdAt: this.getCreatedAt(feedback),
                            subject: pair.submodel.idShort,
                            message: this.getMessage(feedback),
                        });
                    }
                }
            }

            if (count > 0) {
                stars = sumStars / count;
                items.forEach(item => {
                    item.score = item.sum / item.count;
                    item.like = item.score >= 0.0;
                });
            }

            starClassNames = this.initStarClassNames(stars);
        } else {
            starClassNames = this.initStarClassNames(0);
        }

        this.stars = stars;
        this.count = count;
        this.starClassNames = starClassNames;
        this.items = items.filter(item => item.count > 0);
        this.feedbacks = feedbacks;
    }

    private buildItems(general: aas.SubmodelElementCollection, items: GeneralItem[]): void {
        if (general.value) {
            for (const element of general.value.filter(child => child.modelType === 'SubmodelElementCollection')) {
                let item = this.map.get(element.idShort);
                if (!item) {
                    item = {
                        name: this.getName(element),
                        score: 0,
                        sum: 0.0,
                        count: 0,
                        like: false,
                    };

                    this.map.set(element.idShort, item);
                    items.push(item);
                }

                const score = this.getScore(element);
                if (!Number.isNaN(score)) {
                    ++item.count;
                    item.sum += score;
                }
            }
        }
    }

    private getScore(element: aas.Referable): number {
        let score = Number(this.findProperty(element, 'Score')?.value);
        if (!score && !this.findProperty(element, 'Sentiment')?.value) {
            score = Number.NaN;
        }

        return score;
    }

    private getStars(element: aas.Referable): number {
        const property = this.findProperty(element, 'stars');
        return property ? Number(property.value) : 0.0;
    }

    private getMessage(element: aas.Referable): string {
        const property = this.findProperty(element, 'message');
        return property ? String(property.value) : '-';
    }

    private getCreatedAt(element: aas.Referable): string {
        const property = this.findProperty(element, 'createdAt');
        if (property) {
            const date = new Date(String(property.value));
            return date.toLocaleDateString(this.translate.currentLang);
        }

        return '-';
    }

    private initStarClassNames(stars: number): string[] {
        const starClassNames: string[] = [];
        for (let i = 0; i < CustomerFeedbackComponent.maxStars; i++) {
            let className: string;
            const n = stars - i;
            if (n > 0.0) {
                className = n >= 1.0 ? 'bi bi-star-fill' : 'bi-star-half';
            } else {
                className = 'bi bi-star';
            }

            starClassNames.push(className);
        }

        return starClassNames;
    }

    private getName(element: aas.Referable): string {
        return this.translate.instant(`CustomerFeedback.${element.idShort}`);
    }

    private findProperty(element: aas.SubmodelElementCollection, name: string): aas.Property | undefined {
        return element.value?.find(child => child.modelType === 'Property' && child.idShort === name) as aas.Property;
    }
}
