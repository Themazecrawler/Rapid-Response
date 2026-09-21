import {
  documentedVariables,
  missingFromExample,
  referencedVariables,
} from '../../scripts/checkEnvExample';

describe('env example check', () => {
  it('finds variables read directly and through the enabled helper', () => {
    const source = "const a = process.env.DB_HOST; if (!enabled('ENABLE_SMS')) return;";
    expect(referencedVariables(source)).toEqual(['DB_HOST', 'ENABLE_SMS']);
  });

  it('counts commented-out entries as documented', () => {
    const example = 'DB_HOST=localhost\n# TRUST_PROXY=1\nnot a variable\n';
    expect(documentedVariables(example)).toEqual(['DB_HOST', 'TRUST_PROXY']);
  });

  it('reports only the variables missing from the example', () => {
    const sources = ['process.env.DB_HOST; process.env.NEW_SETTING; process.env.NEW_SETTING'];
    expect(missingFromExample(sources, 'DB_HOST=localhost\n')).toEqual(['NEW_SETTING']);
  });

  it('reports nothing when every variable is documented', () => {
    expect(missingFromExample(['process.env.PORT'], '# PORT=5000\n')).toEqual([]);
  });
});
