import StyleDictionary from 'style-dictionary';

// Add theme names here as you create new theme/*.json files
const THEMES = ['dark'];

// ─── Base tokens: component sizing on :root ───────────────────────────────────
const base = new StyleDictionary({
  source: [
    'src/styles/tokens/primitive/primitive.json',
    'src/styles/tokens/component/*.json',
  ],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'src/styles/tokens/build/',
      files: [
        {
          destination: 'tokens.scss',
          format: 'css/variables',
          filter: (token) => !token.filePath.includes('/primitive/'),
          options: { selector: ':root', outputReferences: false },
        },
      ],
    },
  },
});
await base.buildAllPlatforms();

// ─── Theme tokens: semantic color tokens per theme ────────────────────────────
for (const theme of THEMES) {
  const sd = new StyleDictionary({
    source: [
      'src/styles/tokens/primitive/primitive.json',
      'src/styles/tokens/semantic/semantic.json',
      `src/styles/tokens/theme/${theme}.json`,
    ],
    platforms: {
      css: {
        transformGroup: 'css',
        buildPath: 'src/styles/tokens/build/',
        files: [
          {
            destination: `theme-${theme}.scss`,
            format: 'css/variables',
            filter: (token) =>
              !token.filePath.includes('/primitive/') &&
              !token.filePath.includes('/theme/'),
            options: {
              selector: `[data-theme="${theme}"]`,
              outputReferences: false,
            },
          },
        ],
      },
    },
  });
  await sd.buildAllPlatforms();
}
