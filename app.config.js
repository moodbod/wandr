const appJson = require('./app.json');

module.exports = () => {
  const config = appJson.expo;
  const webOutput = process.env.EXPO_WEB_OUTPUT === 'single'
    ? 'single'
    : config.web?.output;

  return {
    ...config,
    web: {
      ...config.web,
      output: webOutput,
    },
  };
};
