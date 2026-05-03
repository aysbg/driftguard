export function run({ repository }) {
  return repository.files
    .filter((f) => /TODO-[A-Za-z0-9_-]+/.test(f.filePath.split('/').pop() ?? ''))
    .map((f) => ({
      id: 'temp-file',
      summary: `Temp file found: ${f.filePath}`,
      severity: 'low',
      confidence: 'high',
      affectedFiles: [f.filePath],
    }));
}
