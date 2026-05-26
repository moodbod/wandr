const appJson = require('./app.json');

module.exports = () => {
  const config = appJson.expo;
  const isSinglePageWebDev = process.env.EXPO_WEB_OUTPUT === 'single';
  const webOutput = isSinglePageWebDev ? 'single' : config.web?.output;

  return {
    ...config,
    experiments: {
      ...config.experiments,
      reactCompiler: isSinglePageWebDev ? false : config.experiments?.reactCompiler,
    },
    web: {
      ...config.web,
      output: webOutput,
    },
  };
};
