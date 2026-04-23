/** @type {import('style-dictionary').Config} */
export default {
  source: [
    'src/styles/tokens/primitive/primitive.json',
    'src/styles/tokens/semantic/semantic.json',
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
          options: {
            selector: ':root',
            outputReferences: false,
          },
        },
      ],
    },
  },
};
