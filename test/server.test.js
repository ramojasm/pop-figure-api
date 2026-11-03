const test = require("node:test");
const assert = require("node:assert/strict");
const { validateFigure, normalizeFigure } = require("../src/server");

test("validates and normalizes screenshot-shaped records", () => {
  const figure = {
    popNumber: "06",
    name: " Peggy Schuyler ",
    releaseYear: 2021,
    category: "Broadway",
    franchise: "Hamilton"
  };
  assert.equal(validateFigure(figure), null);
  assert.deepEqual(normalizeFigure(figure), { ...figure, name: "Peggy Schuyler" });
});

test("rejects malformed pop numbers", () => {
  assert.equal(
    validateFigure({ popNumber: "A6", name: "Example", releaseYear: 2021, category: "X", franchise: "Y" }),
    "popNumber must contain digits only"
  );
});
