export default {
  default: {
    paths: ['tests/bdd/features/**/*.feature'],
    import: ['tests/bdd/support/**/*.js', 'tests/bdd/steps/**/*.js'],
    format: ['progress', 'html:reports/cucumber.html'],
    formatOptions: { snippetInterface: 'async-await' },
    worldParameters: {},
  },
};
