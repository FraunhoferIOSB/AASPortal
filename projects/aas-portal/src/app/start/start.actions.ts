/******************************************************************************
 *
 * Copyright (c) 2019-2023 Fraunhofer IOSB-INA Lemgo,
 * eine rechtlich nicht selbstaendige Einrichtung der Fraunhofer-Gesellschaft
 * zur Foerderung der angewandten Forschung e.V.
 *
 *****************************************************************************/

import { createAction, props } from '@ngrx/store';
import { AASDocument, AASPage, aas } from 'common';
import { TypedAction } from '@ngrx/store/src/models';
import { ViewMode } from 'projects/aas-lib/src/public-api';

export enum StartActionType {
    SET_TREE_VIEW = '[Start] set tree view',
    SET_LIST_VIEW = '[Start] set list view',
    SET_VIEW_MODE = '[Start] set view mode',
    ADD_TREE = '[Start] add tree',
    APPLY_FILTER = '[Start] apply filter',
    GET_FIRST_PAGE = '[Start] get first page',
    GET_NEXT_PAGE = '[Start] get next page',
    GET_PREVIOUS_PAGE = '[Start] previous next page',
    GET_LAST_PAGE = '[Start] get last page',
    SET_PAGE = '[Start] set page',
    SET_CONTENT = '[Start] set content',
    GET_FAVORITES = '[Start] get favorites',
    SET_FAVORITES = '[Start] set favorites',
    REMOVE_FAVORITES = '[Start] remove favorites',
}

export interface GetFirstPageAction extends TypedAction<StartActionType.GET_FIRST_PAGE> {
    limit: number | undefined;
    filter: string | undefined;
}

export interface GetFavoritesAction extends TypedAction<StartActionType.GET_FIRST_PAGE> {
    name: string;
    documents: AASDocument[];
}

export const setListView = createAction(StartActionType.SET_LIST_VIEW);

export const setTreeView = createAction(StartActionType.SET_TREE_VIEW);

export const setViewMode = createAction(StartActionType.SET_VIEW_MODE, props<{ viewMode: ViewMode }>());

export const addTree = createAction(StartActionType.ADD_TREE, props<{ documents: AASDocument[] }>());

export const getFirstPage = createAction(StartActionType.GET_FIRST_PAGE, props<{ limit?: number; filter?: string }>());

export const getNextPage = createAction(StartActionType.GET_NEXT_PAGE);

export const getPreviousPage = createAction(StartActionType.GET_PREVIOUS_PAGE);

export const getLastPage = createAction(StartActionType.GET_LAST_PAGE);

export const setPage = createAction(
    StartActionType.SET_PAGE,
    props<{ page: AASPage; limit: number | undefined; filter: string | undefined }>(),
);

export const setContent = createAction(
    StartActionType.SET_CONTENT,
    props<{ document: AASDocument; content: aas.Environment }>(),
);

export const getFavorites = createAction(
    StartActionType.GET_FAVORITES,
    props<{ name: string; documents: AASDocument[] }>(),
);

export const setFavorites = createAction(
    StartActionType.SET_FAVORITES,
    props<{ name: string; documents: AASDocument[] }>(),
);

export const removeFavorites = createAction(StartActionType.REMOVE_FAVORITES, props<{ favorites: AASDocument[] }>());
