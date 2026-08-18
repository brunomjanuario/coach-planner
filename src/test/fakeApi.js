import { NotFoundError, ValidationError, ConflictError } from "../lib/errors";

/**
 * A stateful in-memory stand-in for `apiFetch(path, {method, body})`
 * (`src/lib/apiClient.js`), routing on method + path exactly like the real
 * API does, so a write is readable by a later read (round-trip tests stay
 * honest — see tasks.md's "Revision note" for why a static
 * `mockResolvedValue` stub is the wrong seam).
 *
 * Usage in a test file:
 *
 *   vi.mock("../../lib/apiClient", () => ({ apiFetch: vi.fn(), silentRefresh: vi.fn() }));
 *   import { apiFetch } from "../../lib/apiClient";
 *   import { createFakeApi } from "../../test/fakeApi";
 *
 *   let fake;
 *   beforeEach(() => {
 *     fake = createFakeApi();
 *     apiFetch.mockImplementation(fake.apiFetch);
 *   });
 *
 * Every write round-trips `body` through `JSON.parse(JSON.stringify(...))`
 * before it's stored, and every read returns a value put through the same
 * round-trip — matching what a real `fetch` does (a `Date` passed in
 * becomes an ISO string; nothing handed back is a live reference into
 * fake state), without hand-serializing every field.
 */

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function defaultSeed() {
  return {
    teams: [
      {
        id: "team-1",
        name: "Sub-11",
        club: "Amadora",
        season: "23/24",
        players: [
          {
            id: "player-1",
            teamId: "team-1",
            name: "João Silva",
            age: 15,
            shirtNumber: 1,
            position: "CAM",
            goals: 3,
            assists: 1,
            concededGoals: 0,
          },
          {
            id: "player-2",
            teamId: "team-1",
            name: "Pedro Santos",
            age: 14,
            shirtNumber: 2,
            position: "CB",
            goals: 0,
            assists: 0,
            concededGoals: 0,
          },
        ],
      },
      {
        id: "team-2",
        name: "Sub-19",
        club: "Areias",
        season: "23/24",
        players: [
          {
            id: "player-3",
            teamId: "team-2",
            name: "Rui Costa",
            age: 18,
            shirtNumber: 9,
            position: "ST",
            goals: 5,
            assists: 2,
            concededGoals: 0,
          },
        ],
      },
    ],
    trainings: [
      {
        id: "training-1",
        teamId: "team-1",
        day: "2024-10-24T15:00:00.000Z",
        duration: 90,
        exercises: [
          {
            id: "exercise-1",
            trainingId: "training-1",
            description: "Corrida",
            numberOfPlayers: 21,
            duration: 10,
            repetitions: 1,
            diagram: null,
          },
          {
            id: "exercise-2",
            trainingId: "training-1",
            description: "SSG",
            numberOfPlayers: 21,
            duration: 20,
            repetitions: 2,
            diagram: null,
          },
        ],
      },
    ],
    games: [
      {
        id: "game-1",
        teamId: "team-1",
        opponent: "Benfica",
        competition: "District League",
        date: "2030-01-01T15:00:00.000Z",
        isHome: true,
        usScore: null,
        themScore: null,
      },
      {
        id: "game-2",
        teamId: "team-1",
        opponent: "Sporting",
        competition: "District League",
        date: "2023-05-01T15:00:00.000Z",
        isHome: false,
        usScore: 2,
        themScore: 1,
      },
    ],
    cards: [{ id: "card-1", playerId: "player-1", gameId: "game-2", type: "yellow" }],
    ratings: [],
    rivalRows: [],
    competitions: [{ id: "competition-1", name: "District League" }],
    opponents: [
      { id: "opponent-1", name: "Benfica" },
      { id: "opponent-2", name: "Sporting" },
    ],
  };
}

/** Points/goalDifference always derived, matching StandingsCalculator.kt / lib/standings.js. */
function toStandingsRow(name, played, won, drawn, lost, goalsFor, goalsAgainst, isOurs) {
  return {
    name,
    played,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    points: won * 3 + drawn,
    isOurs,
  };
}

function computeOurRow(name, teamGames) {
  const played = teamGames.filter((g) => g.usScore != null && g.themScore != null);
  let won = 0;
  let drawn = 0;
  let lost = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  for (const g of played) {
    goalsFor += g.usScore;
    goalsAgainst += g.themScore;
    if (g.usScore > g.themScore) won += 1;
    else if (g.usScore < g.themScore) lost += 1;
    else drawn += 1;
  }
  return toStandingsRow(name, played.length, won, drawn, lost, goalsFor, goalsAgainst, true);
}

function sortStandingsRows(rows) {
  return [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.name.localeCompare(b.name);
  });
}

/**
 * A training's `number` is its 1-based chronological position within its
 * team (ties broken by id), computed across the team's *whole* history
 * before any filtering — matching the backend's own port of AD-108/AD-006.
 * `teamId == null` -> `number: null`.
 */
function withTrainingNumbers(trainings) {
  const byTeam = new Map();
  for (const t of trainings) {
    if (t.teamId == null) continue;
    if (!byTeam.has(t.teamId)) byTeam.set(t.teamId, []);
    byTeam.get(t.teamId).push(t);
  }
  const numberById = new Map();
  for (const list of byTeam.values()) {
    const sorted = [...list].sort((a, b) => {
      const byDay = new Date(a.day) - new Date(b.day);
      return byDay !== 0 ? byDay : String(a.id).localeCompare(String(b.id));
    });
    sorted.forEach((t, i) => numberById.set(t.id, i + 1));
  }
  return trainings.map((t) => ({ ...t, number: numberById.get(t.id) ?? null }));
}

/**
 * `nextId` mints ids as `${prefix}-${n}`. Scans a seed for ids already in
 * that shape (the default seed's `team-1`, `player-2`, ... included) so a
 * freshly minted id can never collide with one the seed already handed
 * out.
 */
function seedCounters(state) {
  const counters = {};
  function bump(id) {
    const m = typeof id === "string" && id.match(/^([a-zA-Z]+)-(\d+)$/);
    if (!m) return;
    counters[m[1]] = Math.max(counters[m[1]] ?? 0, Number(m[2]));
  }
  for (const team of state.teams ?? []) {
    bump(team.id);
    (team.players ?? []).forEach((p) => bump(p.id));
  }
  for (const t of state.trainings ?? []) {
    bump(t.id);
    (t.exercises ?? []).forEach((e) => bump(e.id));
  }
  (state.games ?? []).forEach((g) => bump(g.id));
  (state.cards ?? []).forEach((c) => bump(c.id));
  (state.ratings ?? []).forEach((r) => bump(r.id));
  (state.rivalRows ?? []).forEach((r) => bump(r.id));
  (state.competitions ?? []).forEach((c) => bump(c.id));
  (state.opponents ?? []).forEach((o) => bump(o.id));
  return counters;
}

export function createFakeApi(seed) {
  let state = clone(seed ?? defaultSeed());
  let idCounters = seedCounters(state);
  const failures = [];

  function nextId(prefix) {
    idCounters[prefix] = (idCounters[prefix] ?? 0) + 1;
    return `${prefix}-${idCounters[prefix]}`;
  }

  function reset(nextSeed) {
    state = clone(nextSeed ?? seed ?? defaultSeed());
    idCounters = seedCounters(state);
    failures.length = 0;
  }

  /**
   * Makes the next (or next `times`) call(s) matching `method` + `matcher`
   * reject with `error` instead of routing normally. `matcher` is an exact
   * pathname (querystring ignored), a RegExp tested against the full path
   * (querystring included), or a `(path) => boolean` predicate.
   */
  function forceFailure(method, matcher, error, { times = 1 } = {}) {
    failures.push({ method: method.toUpperCase(), matcher, error, remaining: times });
  }

  function takeFailure(method, path) {
    const entry = failures.find((f) => {
      if (f.method !== method || f.remaining <= 0) return false;
      if (typeof f.matcher === "function") return f.matcher(path);
      if (f.matcher instanceof RegExp) return f.matcher.test(path);
      return f.matcher === path;
    });
    if (!entry) return null;
    entry.remaining -= 1;
    return entry.error;
  }

  function findOrThrow(collection, id, label) {
    const item = collection.find((x) => String(x.id) === String(id));
    if (!item) throw new NotFoundError(`${label} not found.`);
    return item;
  }

  // --- teams -----------------------------------------------------------

  function handleTeams(method, id, params, body) {
    if (method === "GET" && id == null) return clone(state.teams);
    if (method === "GET") return clone(findOrThrow(state.teams, id, "Team"));
    if (method === "POST") {
      const team = { players: [], ...body, id: nextId("team") };
      state.teams.push(team);
      return clone(team);
    }
    if (method === "PATCH") {
      const team = findOrThrow(state.teams, id, "Team");
      Object.assign(team, body, { id: team.id });
      return clone(team);
    }
    if (method === "DELETE") {
      const team = findOrThrow(state.teams, id, "Team");
      const playerIds = team.players.map((p) => String(p.id));
      state.teams = state.teams.filter((t) => t !== team);
      state.cards = state.cards.filter((c) => !playerIds.includes(String(c.playerId)));
      state.ratings = state.ratings.filter((r) => !playerIds.includes(String(r.playerId)));
      return null;
    }
    return undefined;
  }

  function handlePlayers(method, teamId, playerId, body) {
    const team = findOrThrow(state.teams, teamId, "Team");
    if (method === "POST") {
      const player = { ...body, teamId: team.id, id: nextId("player") };
      team.players.push(player);
      return clone(player);
    }
    const player = findOrThrow(team.players, playerId, "Player");
    if (method === "PATCH") {
      Object.assign(player, body, { id: player.id, teamId: team.id });
      return clone(player);
    }
    if (method === "DELETE") {
      team.players = team.players.filter((p) => p !== player);
      state.cards = state.cards.filter((c) => String(c.playerId) !== String(playerId));
      state.ratings = state.ratings.filter((r) => String(r.playerId) !== String(playerId));
      return null;
    }
    return undefined;
  }

  // --- trainings ---------------------------------------------------------

  function handleTrainings(method, id, params, body) {
    if (method === "GET" && id == null) {
      let trainings = withTrainingNumbers(state.trainings);
      const teamId = params.get("teamId");
      const assigned = params.get("assigned");
      if (teamId != null) trainings = trainings.filter((t) => String(t.teamId) === teamId);
      if (assigned === "false") trainings = trainings.filter((t) => t.teamId == null);
      return clone(trainings);
    }
    if (method === "GET") {
      const training = findOrThrow(state.trainings, id, "Training");
      const numbered = withTrainingNumbers(state.trainings).find((t) => t.id === training.id);
      return clone(numbered);
    }
    if (method === "POST") {
      const trainingId = nextId("training");
      const exercises = (body.exercises ?? []).map((e) => ({
        ...e,
        id: e.id ?? nextId("exercise"),
        trainingId,
      }));
      const training = { ...body, id: trainingId, exercises };
      state.trainings.push(training);
      return clone(training);
    }
    if (method === "PATCH") {
      const training = findOrThrow(state.trainings, id, "Training");
      const exercises = (body.exercises ?? training.exercises).map((e) => ({
        ...e,
        id: e.id ?? nextId("exercise"),
        trainingId: training.id,
      }));
      Object.assign(training, body, { id: training.id, exercises });
      return clone(training);
    }
    if (method === "DELETE") {
      const training = findOrThrow(state.trainings, id, "Training");
      state.trainings = state.trainings.filter((t) => t !== training);
      state.ratings = state.ratings.filter(
        (r) => !(r.eventType === "training" && String(r.eventId) === String(id))
      );
      return null;
    }
    return undefined;
  }

  // --- games ---------------------------------------------------------

  function handleGames(method, id, sub, params, body) {
    if (sub === "result") {
      const game = findOrThrow(state.games, id, "Game");
      if (method === "PUT") {
        game.usScore = body.us;
        game.themScore = body.them;
        return clone(game);
      }
      if (method === "DELETE") {
        game.usScore = null;
        game.themScore = null;
        return clone(game);
      }
      return undefined;
    }
    if (method === "GET" && id == null) {
      let games = state.games;
      const status = params.get("status");
      const teamId = params.get("teamId");
      const assigned = params.get("assigned");
      if (status === "scheduled") games = games.filter((g) => g.usScore == null);
      if (status === "played") games = games.filter((g) => g.usScore != null);
      if (teamId != null) games = games.filter((g) => String(g.teamId) === teamId);
      if (assigned === "false") games = games.filter((g) => g.teamId == null);
      return clone(games);
    }
    if (method === "POST") {
      const game = {
        usScore: null,
        themScore: null,
        ...body,
        id: nextId("game"),
      };
      state.games.push(game);
      return clone(game);
    }
    if (method === "PATCH") {
      const game = findOrThrow(state.games, id, "Game");
      Object.assign(game, body, { id: game.id });
      return clone(game);
    }
    if (method === "DELETE") {
      const game = findOrThrow(state.games, id, "Game");
      state.games = state.games.filter((g) => g !== game);
      state.cards = state.cards.filter((c) => String(c.gameId) !== String(id));
      state.ratings = state.ratings.filter(
        (r) => !(r.eventType === "game" && String(r.eventId) === String(id))
      );
      return null;
    }
    return undefined;
  }

  // --- cards ---------------------------------------------------------

  function handleCards(method, id, params, body) {
    if (method === "GET" && id == null) {
      let cards = state.cards;
      const gameId = params.get("gameId");
      const playerId = params.get("playerId");
      if (gameId != null) cards = cards.filter((c) => String(c.gameId) === gameId);
      if (playerId != null) cards = cards.filter((c) => String(c.playerId) === playerId);
      return clone(cards);
    }
    if (method === "POST") {
      const card = { ...body, id: nextId("card") };
      state.cards.push(card);
      return clone(card);
    }
    if (method === "DELETE") {
      findOrThrow(state.cards, id, "Card");
      state.cards = state.cards.filter((c) => String(c.id) !== String(id));
      return null;
    }
    return undefined;
  }

  // --- ratings ---------------------------------------------------------

  function ratingTriple(rating) {
    return `${rating.eventType}:${rating.eventId}:${rating.playerId}`;
  }

  function handleRatings(method, id, params) {
    if (method === "GET") {
      let ratings = state.ratings;
      const eventType = params.get("eventType");
      const eventId = params.get("eventId");
      const playerId = params.get("playerId");
      if (eventId != null) {
        ratings = ratings.filter(
          (r) => r.eventType === eventType && String(r.eventId) === eventId
        );
      } else if (playerId != null) {
        ratings = ratings.filter((r) => String(r.playerId) === playerId);
        if (eventType != null) ratings = ratings.filter((r) => r.eventType === eventType);
      }
      return clone(ratings);
    }
    if (method === "DELETE") {
      findOrThrow(state.ratings, id, "Rating");
      state.ratings = state.ratings.filter((r) => String(r.id) !== String(id));
      return null;
    }
    return undefined;
  }

  function handleSetRating(eventType, eventId, playerId, body) {
    const triple = `${eventType}:${eventId}:${playerId}`;
    const existing = state.ratings.find((r) => ratingTriple(r) === triple);
    if (body.value === null) {
      if (existing) state.ratings = state.ratings.filter((r) => r !== existing);
      return null;
    }
    if (existing) {
      existing.value = body.value;
      return clone(existing);
    }
    const rating = { id: nextId("rating"), playerId, eventType, eventId, value: body.value };
    state.ratings.push(rating);
    return clone(rating);
  }

  // --- standings ---------------------------------------------------------

  function handleStandingsTable(params) {
    const teamId = params.get("teamId");
    if (teamId == null) throw new ValidationError("teamId is required.", { teamId: "is required" });
    const team = findOrThrow(state.teams, teamId, "Team");
    const teamGames = state.games.filter((g) => String(g.teamId) === teamId);
    const ourRow = computeOurRow(team.name, teamGames);
    const rivalRows = state.rivalRows.map((r) =>
      toStandingsRow(r.name, r.played, r.won, r.drawn, r.lost, r.goalsFor, r.goalsAgainst, false)
    );
    return sortStandingsRows([ourRow, ...rivalRows]);
  }

  function handleRivalRows(method, id, body) {
    if (method === "GET") return clone(state.rivalRows);
    if (method === "POST") {
      const row = { ...body, id: nextId("rival") };
      state.rivalRows.push(row);
      return clone(row);
    }
    if (method === "PATCH") {
      const row = findOrThrow(state.rivalRows, id, "Rival row");
      Object.assign(row, body, { id: row.id });
      return clone(row);
    }
    if (method === "DELETE") {
      findOrThrow(state.rivalRows, id, "Rival row");
      state.rivalRows = state.rivalRows.filter((r) => String(r.id) !== String(id));
      return null;
    }
    return undefined;
  }

  // --- competitions / opponents ------------------------------------------

  /** Shared shape for the two managed reference lists (AD-010): a flat named collection, plus a rename cascade onto every game's matching string field. */
  function handleReferenceList(collectionKey, gameField, method, id, body) {
    const collection = state[collectionKey];
    if (method === "GET") return clone(collection);
    if (method === "POST") {
      const dup = collection.some((x) => x.name.toLowerCase() === body.name.toLowerCase());
      if (dup) throw new ConflictError(`"${body.name}" already exists.`);
      const item = { id: nextId(collectionKey), name: body.name };
      collection.push(item);
      return clone(item);
    }
    if (method === "PATCH") {
      const item = findOrThrow(collection, id, "Reference list item");
      const dup = collection.some(
        (x) => x !== item && x.name.toLowerCase() === body.name.toLowerCase()
      );
      if (dup) throw new ConflictError(`"${body.name}" already exists.`);
      const oldName = item.name;
      item.name = body.name;
      for (const game of state.games) {
        if (game[gameField] === oldName) game[gameField] = body.name;
      }
      return clone(item);
    }
    if (method === "DELETE") {
      findOrThrow(collection, id, "Reference list item");
      state[collectionKey] = collection.filter((x) => String(x.id) !== String(id));
      return null;
    }
    return undefined;
  }

  // --- routing ---------------------------------------------------------

  async function apiFetch(path, { method = "GET", body } = {}) {
    const requestBody = clone(body);
    const url = new URL(path, "http://fake.local");
    const p = url.pathname;
    const params = url.searchParams;

    const failure = takeFailure(method, path);
    if (failure) throw failure;

    let m;

    if ((m = p.match(/^\/teams\/([^/]+)\/players\/([^/]+)$/))) {
      return handlePlayers(method, m[1], m[2], requestBody);
    }
    if ((m = p.match(/^\/teams\/([^/]+)\/players$/))) {
      return handlePlayers(method, m[1], null, requestBody);
    }
    if ((m = p.match(/^\/teams\/([^/]+)$/))) {
      return handleTeams(method, m[1], params, requestBody);
    }
    if (p === "/teams") return handleTeams(method, null, params, requestBody);

    if ((m = p.match(/^\/trainings\/([^/]+)$/))) {
      return handleTrainings(method, m[1], params, requestBody);
    }
    if (p === "/trainings") return handleTrainings(method, null, params, requestBody);

    if ((m = p.match(/^\/games\/([^/]+)\/result$/))) {
      return handleGames(method, m[1], "result", params, requestBody);
    }
    if ((m = p.match(/^\/games\/([^/]+)$/))) {
      return handleGames(method, m[1], null, params, requestBody);
    }
    if (p === "/games") return handleGames(method, null, null, params, requestBody);

    if ((m = p.match(/^\/cards\/([^/]+)$/))) {
      return handleCards(method, m[1], params, requestBody);
    }
    if (p === "/cards") return handleCards(method, null, params, requestBody);

    if (
      (m = p.match(/^\/ratings\/([^/]+)\/([^/]+)\/players\/([^/]+)$/)) &&
      method === "PUT"
    ) {
      return handleSetRating(m[1], m[2], m[3], requestBody);
    }
    if ((m = p.match(/^\/ratings\/([^/]+)$/))) {
      return handleRatings(method, m[1], params);
    }
    if (p === "/ratings") return handleRatings(method, null, params);

    if (p === "/standings") return handleStandingsTable(params);
    if ((m = p.match(/^\/standings\/rivals\/([^/]+)$/))) {
      return handleRivalRows(method, m[1], requestBody);
    }
    if (p === "/standings/rivals") return handleRivalRows(method, null, requestBody);

    if ((m = p.match(/^\/competitions\/([^/]+)$/))) {
      return handleReferenceList("competitions", "competition", method, m[1], requestBody);
    }
    if (p === "/competitions") {
      return handleReferenceList("competitions", "competition", method, null, requestBody);
    }

    if ((m = p.match(/^\/opponents\/([^/]+)$/))) {
      return handleReferenceList("opponents", "opponent", method, m[1], requestBody);
    }
    if (p === "/opponents") {
      return handleReferenceList("opponents", "opponent", method, null, requestBody);
    }

    throw new NotFoundError(`No fake route for ${method} ${path}`);
  }

  return {
    apiFetch,
    get state() {
      return state;
    },
    reset,
    forceFailure,
  };
}
