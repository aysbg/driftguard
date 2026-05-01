export interface IndexedRoute {
  method: string;
  path: string;
  filePath: string;
  line: number;
  snippet: string;
}

export interface IndexedFile {
  filePath: string;
  routes: IndexedRoute[];
}

export interface RepositoryIndex {
  files: IndexedFile[];
}