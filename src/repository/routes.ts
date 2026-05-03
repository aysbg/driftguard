import { relative, sep } from 'node:path';
import { Node, SyntaxKind, type CallExpression, type NoSubstitutionTemplateLiteral, type SourceFile, type StringLiteral } from 'ts-morph';
import type { IndexedRoute } from '../types/repository.js';

const SUPPORTED_ROUTE_TARGETS = new Set(['app', 'fastify', 'router']);
const SUPPORTED_ROUTE_METHODS = new Set(['delete', 'get', 'patch', 'post', 'put']);

export function indexRoutesInSourceFile(sourceFile: SourceFile, repoRoot: string): IndexedRoute[] {
  const callExpressionRoutes = sourceFile
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .map((callExpression) => toIndexedRoute(callExpression, repoRoot))
    .filter((route): route is IndexedRoute => route !== undefined);

  return [...callExpressionRoutes, ...toNestIndexedRoutes(sourceFile, repoRoot)].sort(
    (left, right) => left.line - right.line || left.method.localeCompare(right.method) || left.path.localeCompare(right.path)
  );
}

function toNestIndexedRoutes(sourceFile: SourceFile, repoRoot: string): IndexedRoute[] {
  const indexedRoutes: IndexedRoute[] = [];

  for (const classDeclaration of sourceFile.getClasses()) {
    const controllerDecorator = classDeclaration
      .getDecorators()
      .find((decorator) => decorator.getName().toLowerCase() === 'controller');

    if (!controllerDecorator) {
      continue;
    }

    const controllerPrefix = getDecoratorPathLiteral(controllerDecorator);
    if (controllerPrefix === undefined) {
      continue;
    }

    for (const methodDeclaration of classDeclaration.getMethods()) {
      for (const decorator of methodDeclaration.getDecorators()) {
        const method = toNestRouteMethod(decorator.getName());
        if (!method) {
          continue;
        }

        const methodPath = getDecoratorPathLiteral(decorator);
        if (methodPath === undefined) {
          continue;
        }

        indexedRoutes.push({
          method,
          path: normalizeRoutePath(combineNestControllerAndMethodPath(controllerPrefix, methodPath)),
          filePath: toRelativeFilePath(repoRoot, sourceFile.getFilePath()),
          line: decorator.getStartLineNumber(),
          snippet: decorator.getText()
        });
      }
    }
  }

  return indexedRoutes;
}

function toIndexedRoute(callExpression: CallExpression, repoRoot: string): IndexedRoute | undefined {
  const expression = callExpression.getExpression();
  if (!Node.isPropertyAccessExpression(expression)) {
    return undefined;
  }

  const routeTarget = expression.getExpression().getText();
  const routeMethod = expression.getName().toLowerCase();

  if (!SUPPORTED_ROUTE_TARGETS.has(routeTarget) || !SUPPORTED_ROUTE_METHODS.has(routeMethod)) {
    return undefined;
  }

  const [pathArgument] = callExpression.getArguments();
  if (!pathArgument || !isSupportedPathArgument(pathArgument)) {
    return undefined;
  }

  return {
    method: routeMethod.toUpperCase(),
    path: normalizeRoutePath(pathArgument.getLiteralText()),
    filePath: toRelativeFilePath(repoRoot, callExpression.getSourceFile().getFilePath()),
    line: callExpression.getStartLineNumber(),
    snippet: callExpression.getText()
  };
}

function isSupportedPathArgument(argument: Node): argument is StringLiteral | NoSubstitutionTemplateLiteral {
  return Node.isStringLiteral(argument) || Node.isNoSubstitutionTemplateLiteral(argument);
}

function getDecoratorPathLiteral(decorator: { getArguments(): Node[] }): string | undefined {
  const [firstArgument] = decorator.getArguments();
  if (!firstArgument) {
    return '';
  }

  if (!Node.isStringLiteral(firstArgument)) {
    return undefined;
  }

  return firstArgument.getLiteralText();
}

function toNestRouteMethod(decoratorName: string): string | undefined {
  const routeMethod = decoratorName.toLowerCase();
  if (!SUPPORTED_ROUTE_METHODS.has(routeMethod)) {
    return undefined;
  }

  return routeMethod.toUpperCase();
}

function combineNestControllerAndMethodPath(controllerPrefix: string, methodPath: string): string {
  if (!controllerPrefix) {
    return methodPath.startsWith('/') ? methodPath : `/${methodPath}`;
  }

  const normalizedPrefix = controllerPrefix.startsWith('/') ? controllerPrefix : `/${controllerPrefix}`;
  const prefixedWithTrailingSlash = normalizedPrefix.endsWith('/') ? normalizedPrefix : `${normalizedPrefix}/`;
  const normalizedMethodPath = methodPath.startsWith('/') ? methodPath.slice(1) : methodPath;
  const combinedPath = `${prefixedWithTrailingSlash}${normalizedMethodPath}`;
  return combinedPath.length > 1 && combinedPath.endsWith('/') ? combinedPath.slice(0, -1) : combinedPath;
}

function normalizeRoutePath(routePath: string): string {
  return routePath.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function toRelativeFilePath(repoRoot: string, filePath: string): string {
  return relative(repoRoot, filePath).split(sep).join('/');
}
