import { relative, sep } from 'node:path';
import { Node, SyntaxKind, type CallExpression, type NoSubstitutionTemplateLiteral, type SourceFile, type StringLiteral } from 'ts-morph';
import type { IndexedRoute } from '../types/repository.js';

const SUPPORTED_ROUTE_TARGETS = new Set(['app', 'fastify', 'router']);
const SUPPORTED_ROUTE_METHODS = new Set(['delete', 'get', 'patch', 'post', 'put']);

export function indexRoutesInSourceFile(sourceFile: SourceFile, repoRoot: string): IndexedRoute[] {
  return sourceFile
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .map((callExpression) => toIndexedRoute(callExpression, repoRoot))
    .filter((route): route is IndexedRoute => route !== undefined)
    .sort((left, right) => left.line - right.line || left.method.localeCompare(right.method) || left.path.localeCompare(right.path));
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

function normalizeRoutePath(routePath: string): string {
  return routePath.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function toRelativeFilePath(repoRoot: string, filePath: string): string {
  return relative(repoRoot, filePath).split(sep).join('/');
}
