const fs = await import('node:fs');
const path = await import('node:path');
const file = process.argv[2];
const content = fs.readFileSync(file, 'utf8');

const newContent =
  `  it('does not fail on high-only when only medium finding present', async () => {
    const findings = [makeFinding('medium')];
    const result = evaluateEnforcement(findings, ['high']);
    expect(result.shouldFail).toBe(false);
    expect(result.failingFindings).toHaveLength(0);
  });

  it('cascades — fail-on medium also catches high finding', async () => {
    const findings = [makeFinding('high')];
    const result = evaluateEnforcement(findings, ['medium']);
    expect(result.shouldFail).toBe(true);
    expect(result.failingFindings).toHaveLength(1);
  });

  it('fails on medium when medium finding present', async () => {
    const findings = [makeFinding('medium')];
    const result = evaluateEnforcement(findings, ['medium']);
    expect(result.shouldFail).toBe(true);
    expect(result.failingFindings).toHaveLength(1);
  });

  it('filters out low when fail-on is medium (no high/medium present)', async () => {
    const findings = [makeFinding('low')];
    const result = evaluateEnforcement(findings, ['medium']);
    expect(result.shouldFail).toBe(false);
    expect(result.failingFindings).toHaveLength(0);
  });

  it('cascades with mixed findings when fail-on medium', async () => {
    const findings = [makeFinding('high'), makeFinding('medium'), makeFinding('low')];
    const result = evaluateEnforcement(findings, ['medium']);
    expect(result.shouldFail).toBe(true);
    expect(result.failingFindings).toHaveLength(2);
    expect(result.failingFindings.map((f) => f.severity)).toEqual(['high', 'medium']);
  });`;

if (!content.includes(newContent.split('\n')[1])) {
  console.log('Replacing...');
  const oldBlock = content.substring(content.indexOf("  it('does not fail on high-only when only medium finding present'"), content.indexOf("  it('preserves default behavior when failOn is undefined'"));
  const finalContent = content.replace(oldBlock, newContent + '\n\n  ');
  fs.writeFileSync(file, finalContent);
} else {
  console.log('Already replaced');
}
