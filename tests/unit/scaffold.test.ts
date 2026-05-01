import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('scaffold sanity tests', () => {
  it('package.json declares ESM type module', () => {
    const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf-8'));
    expect(pkg.type).toBe('module');
  });

  it('package.json declares driftguard bin pointing to dist/cli.js', () => {
    const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf-8'));
    expect(pkg.bin).toEqual({ driftguard: './dist/cli.js' });
  });

  it('package.json requires Node >=22', () => {
    const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf-8'));
    expect(pkg.engines?.node).toBe('>=22');
  });

  it('package.json includes required scripts', () => {
    const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf-8'));
    expect(pkg.scripts).toHaveProperty('build');
    expect(pkg.scripts).toHaveProperty('typecheck');
    expect(pkg.scripts).toHaveProperty('test');
    expect(pkg.scripts).toHaveProperty('test:unit');
    expect(pkg.scripts).toHaveProperty('test:cli');
  });

  it('package.json includes runtime dependencies', () => {
    const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf-8'));
    expect(pkg.dependencies).toHaveProperty('commander');
    expect(pkg.dependencies).toHaveProperty('zod');
    expect(pkg.dependencies).toHaveProperty('yaml');
    expect(pkg.dependencies).toHaveProperty('fast-glob');
    expect(pkg.dependencies).toHaveProperty('unified');
    expect(pkg.dependencies).toHaveProperty('remark-parse');
    expect(pkg.dependencies).toHaveProperty('remark-gfm');
    expect(pkg.dependencies).toHaveProperty('@apidevtools/swagger-parser');
    expect(pkg.dependencies).toHaveProperty('picocolors');
    expect(pkg.dependencies).toHaveProperty('ts-morph');
  });

  it('package.json includes dev dependencies', () => {
    const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf-8'));
    expect(pkg.devDependencies).toHaveProperty('typescript');
    expect(pkg.devDependencies).toHaveProperty('vitest');
  });

  it('tsconfig.json targets NodeNext module and moduleResolution', () => {
    const tsconfig = JSON.parse(readFileSync(resolve('tsconfig.json'), 'utf-8'));
    expect(tsconfig.compilerOptions.module).toBe('NodeNext');
    expect(tsconfig.compilerOptions.moduleResolution).toBe('NodeNext');
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.outDir).toBe('dist');
    expect(tsconfig.compilerOptions.rootDir).toBe('src');
  });

  it('vitest.config.ts uses defineConfig', () => {
    const config = readFileSync(resolve('vitest.config.ts'), 'utf-8');
    expect(config).toContain('defineConfig');
  });

  it('src/index.ts exports packageName and version without side effects', async () => {
    const { packageName, version } = await import(resolve('src/index.ts'));
    expect(packageName).toBe('driftguard');
    expect(version).toBe('0.1.0');
  });
});