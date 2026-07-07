// Runs after the test framework is set up. Reset fetch between tests.
afterEach(() => {
  if (global.fetch && global.fetch.mockReset) global.fetch.mockReset();
});
