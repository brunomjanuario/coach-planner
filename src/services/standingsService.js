import { getCollection, setCollection } from "./store";
import { newId } from "../lib/id";
import { NotFoundError, ValidationError } from "../lib/errors";

const FIGURE_FIELDS = [
  "played",
  "won",
  "drawn",
  "lost",
  "goalsFor",
  "goalsAgainst",
];

function getRows() {
  return getCollection("standings");
}

function saveRows(rows) {
  setCollection("standings", rows);
}

/**
 * Throws ValidationError when any figure is negative, or when won + drawn +
 * lost doesn't sum to played (AC GAME-09.3). Points and goalDifference are
 * never accepted as input (AC GAME-09.2) — this function doesn't even look
 * at them.
 */
function validate(rowData) {
  for (const field of FIGURE_FIELDS) {
    if (Number(rowData[field]) < 0) {
      throw new ValidationError(`${field} cannot be negative.`);
    }
  }

  const summed = rowData.won + rowData.drawn + rowData.lost;
  if (summed !== rowData.played) {
    throw new ValidationError(
      `Won, drawn and lost (${summed}) must add up to played (${rowData.played}).`
    );
  }
}

export const standingsService = {
  getAll: async () => {
    return getRows();
  },

  create: async (rowData) => {
    validate(rowData);
    const rows = getRows();
    const newRow = {
      id: newId(),
      name: rowData.name,
      played: rowData.played,
      won: rowData.won,
      drawn: rowData.drawn,
      lost: rowData.lost,
      goalsFor: rowData.goalsFor,
      goalsAgainst: rowData.goalsAgainst,
    };
    rows.push(newRow);
    saveRows(rows);
    return newRow;
  },

  update: async (rowData) => {
    validate(rowData);
    const rows = getRows();
    const index = rows.findIndex((row) => row.id === rowData.id);
    if (index === -1) {
      throw new NotFoundError(`Rival row not found: ${rowData.id}`);
    }
    rows[index] = { ...rows[index], ...rowData };
    saveRows(rows);
    return rows[index];
  },

  delete: async (id) => {
    const rows = getRows().filter((row) => row.id !== id);
    saveRows(rows);
  },
};
