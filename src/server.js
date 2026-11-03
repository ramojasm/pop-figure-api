const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");

const app = express();
const port = Number(process.env.PORT || 3000);
const dataFile = path.join(__dirname, "..", "data", "figures.json");

app.use(express.json());

let figures = [];

async function loadFigures() {
  figures = JSON.parse(await fs.readFile(dataFile, "utf8"));
}

async function saveFigures() {
  await fs.writeFile(dataFile, `${JSON.stringify(figures, null, 2)}\n`);
}

function validateFigure(input, partial = false) {
  const allowed = ["popNumber", "name", "releaseYear", "releaseYearEstimated", "category", "franchise"];
  const unknown = Object.keys(input).filter((key) => !allowed.includes(key));
  if (unknown.length) return `Unknown field(s): ${unknown.join(", ")}`;

  const required = ["popNumber", "name", "releaseYear", "category", "franchise"];
  if (!partial) {
    const missing = required.filter((key) => input[key] === undefined);
    if (missing.length) return `Missing required field(s): ${missing.join(", ")}`;
  }

  if (input.popNumber !== undefined && !/^[0-9]+$/.test(String(input.popNumber))) {
    return "popNumber must contain digits only";
  }
  if (input.name !== undefined && (typeof input.name !== "string" || !input.name.trim())) {
    return "name must be a non-empty string";
  }
  if (input.releaseYear !== undefined && (!Number.isInteger(input.releaseYear) || input.releaseYear < 1900)) {
    return "releaseYear must be an integer of 1900 or later";
  }
  for (const field of ["category", "franchise"]) {
    if (input[field] !== undefined && (typeof input[field] !== "string" || !input[field].trim())) {
      return `${field} must be a non-empty string`;
    }
  }
  if (input.releaseYearEstimated !== undefined && typeof input.releaseYearEstimated !== "boolean") {
    return "releaseYearEstimated must be a boolean";
  }
  return null;
}

function normalizeFigure(input) {
  return {
    popNumber: String(input.popNumber),
    name: input.name.trim(),
    releaseYear: input.releaseYear,
    ...(input.releaseYearEstimated ? { releaseYearEstimated: true } : {}),
    category: input.category.trim(),
    franchise: input.franchise.trim()
  };
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/figures", (req, res) => {
  const { search, category, franchise, releaseYear } = req.query;
  const page = Math.max(Number.parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || "50", 10), 1), 100);
  const query = String(search || "").toLowerCase();

  const filtered = figures.filter((figure) => {
    const searchable = `${figure.popNumber} ${figure.name} ${figure.category} ${figure.franchise}`.toLowerCase();
    return (!query || searchable.includes(query))
      && (!category || figure.category.toLowerCase() === String(category).toLowerCase())
      && (!franchise || figure.franchise.toLowerCase() === String(franchise).toLowerCase())
      && (!releaseYear || figure.releaseYear === Number(releaseYear));
  });

  const start = (page - 1) * limit;
  res.json({
    data: filtered.slice(start, start + limit),
    pagination: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) }
  });
});

app.get("/figures/:popNumber", (req, res) => {
  const figure = figures.find((item) => item.popNumber === req.params.popNumber);
  if (!figure) return res.status(404).json({ error: "Figure not found" });
  return res.json(figure);
});

app.post("/figures", async (req, res, next) => {
  const error = validateFigure(req.body);
  if (error) return res.status(400).json({ error });
  const figure = normalizeFigure(req.body);
  if (figures.some((item) => item.popNumber === figure.popNumber)) {
    return res.status(409).json({ error: "A figure with that popNumber already exists" });
  }
  figures.push(figure);
  try {
    await saveFigures();
    return res.status(201).json(figure);
  } catch (saveError) {
    return next(saveError);
  }
});

app.patch("/figures/:popNumber", async (req, res, next) => {
  const error = validateFigure(req.body, true);
  if (error) return res.status(400).json({ error });
  const index = figures.findIndex((item) => item.popNumber === req.params.popNumber);
  if (index === -1) return res.status(404).json({ error: "Figure not found" });

  const updated = normalizeFigure({ ...figures[index], ...req.body });
  if (updated.popNumber !== req.params.popNumber
    && figures.some((item) => item.popNumber === updated.popNumber)) {
    return res.status(409).json({ error: "A figure with that popNumber already exists" });
  }
  figures[index] = updated;
  try {
    await saveFigures();
    return res.json(updated);
  } catch (saveError) {
    return next(saveError);
  }
});

app.delete("/figures/:popNumber", async (req, res, next) => {
  const index = figures.findIndex((item) => item.popNumber === req.params.popNumber);
  if (index === -1) return res.status(404).json({ error: "Figure not found" });
  figures.splice(index, 1);
  try {
    await saveFigures();
    return res.status(204).send();
  } catch (saveError) {
    return next(saveError);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

if (require.main === module) {
  loadFigures()
    .then(() => app.listen(port, () => console.log(`Pop figure API listening on port ${port}`)))
    .catch((error) => {
      console.error("Could not load figure data", error);
      process.exitCode = 1;
    });
}

module.exports = { app, validateFigure, normalizeFigure };
