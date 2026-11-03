# Pop Figure API

A small REST API for cataloging Pop figures using the fields shown in the reference screenshots.

## Run locally

```bash
npm install
npm start
```

The server listens on `http://localhost:3000` (or `PORT`).

## Endpoints

- `GET /health`
- `GET /figures?search=loki&category=Marvel&franchise=Loki&releaseYear=2021&page=1&limit=50`
- `GET /figures/:popNumber`
- `POST /figures`
- `PATCH /figures/:popNumber`
- `DELETE /figures/:popNumber`

Create and update requests use JSON:

```json
{
  "popNumber": "898",
  "name": "President Loki",
  "releaseYear": 2021,
  "category": "Marvel",
  "franchise": "Loki",
  "releaseYearEstimated": false
}
```

`popNumber` is a string so values such as `"06"` remain unchanged. The asterisk in `2023*` is represented by `releaseYearEstimated: true`.
