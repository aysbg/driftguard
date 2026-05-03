export interface IndexedRoute {
  method: string;
  path: string;
  filePath: string;
  line: number;
  snippet: string;
}

export interface IndexedModel {
  name: string;
  kind: 'interface' | 'type_alias';
  filePath: string;
  line: number;
  snippet: string;
}

export type IndexedType = IndexedModel;

export interface IndexedFile {
  filePath: string;
  routes: IndexedRoute[];
  models?: IndexedModel[];
  types?: IndexedType[];
}

export interface RepositoryIndex {
  files: IndexedFile[];
}