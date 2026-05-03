import { isAbsolute, resolve } from 'node:path';
import { Project, SyntaxKind } from 'ts-morph';

import type { DriftFinding } from '../types/finding.js';
import type { RepositoryIndex } from '../types/repository.js';
import type { BusinessRule } from '../types/spec.js';
import {
  businessRuleReferencedId,
  businessRuleUnreferencedSeverity,
  heuristicConfidence,
} from '../rules/finding-conventions.js';

export function evaluateBusinessRuleReferenced(
  businessRules: BusinessRule[],
  repository: RepositoryIndex,
): DriftFinding[] {
  const sourceFiles = buildProject(repository);

  return businessRules
    .filter((rule) => !isRuleReferenced(rule, sourceFiles))
    .map(toFinding)
    .sort((left, right) => left.id.localeCompare(right.id));
}

function buildProject(repository: RepositoryIndex) {
  const project = new Project({ skipAddingFilesFromTsConfig: true });

  for (const file of repository.files) {
    project.addSourceFileAtPathIfExists(toAbsolutePath(file.filePath));
  }

  return project.getSourceFiles();
}

function toAbsolutePath(filePath: string): string {
  return isAbsolute(filePath) ? filePath : resolve(filePath);
}

function isRuleReferenced(rule: BusinessRule, sourceFiles: ReturnType<Project['getSourceFiles']>): boolean {
  const searchTerms = getSearchTerms(rule);

  return sourceFiles.some((sourceFile) => {
    const identifierMatches = sourceFile
      .getDescendantsOfKind(SyntaxKind.Identifier)
      .some((identifier) => includesAnyTerm(identifier.getText(), searchTerms));

    if (identifierMatches) {
      return true;
    }

    const stringMatches = sourceFile
      .getDescendantsOfKind(SyntaxKind.StringLiteral)
      .some((literal) => includesAnyTerm(literal.getLiteralText(), searchTerms));

    if (stringMatches) {
      return true;
    }

    return sourceFile
      .getDescendantsOfKind(SyntaxKind.NoSubstitutionTemplateLiteral)
      .some((literal) => includesAnyTerm(literal.getLiteralText(), searchTerms));
  });
}

function getSearchTerms(rule: BusinessRule): string[] {
  const titleWords = rule.title
    .split(/[^a-zA-Z0-9]+/)
    .filter((word) => word.length >= 3);

  return [rule.id, ...titleWords].map((term) => term.toLowerCase());
}

function includesAnyTerm(text: string, terms: string[]): boolean {
  const normalizedText = text.toLowerCase();

  return terms.some((term) => normalizedText.includes(term));
}

function toFinding(rule: BusinessRule): DriftFinding {
  return {
    id: businessRuleReferencedId(rule.id, rule.filePath),
    summary: `Business rule '${rule.title}' is documented but not referenced in code`,
    severity: businessRuleUnreferencedSeverity,
    confidence: heuristicConfidence,
    mappingConfidence: 'medium',
    affectedFiles: [rule.filePath],
    specReferences: [rule.filePath],
    explanation: {
      expected: 'code references to business rule',
      found: 'no references to rule ID or title keywords in code',
      reason: 'Business rule is documented but not implemented or referenced',
    },
  };
}
