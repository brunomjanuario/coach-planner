import { useState, useEffect } from "react";
import { teamService } from "../services/teamService";
import { trainingService } from "../services/trainingService";
import { gameService } from "../services/gameService";
import { cardService } from "../services/cardService";
import { ratingService } from "../services/ratingService";
import {
  counts,
  topScorers,
  topCarded,
  topTeamGames,
  topRated,
  nextEvent,
  teamRows,
  upcomingRows,
} from "../lib/dashboardStats";
import { formatTrainingDate } from "../lib/trainingDisplay";
import { formatGameDate, homeAwayPrefix } from "../lib/gameSchedule";
import StatTile from "../components/StatTile";
import ListTile from "../components/ListTile";
import LeaderTile from "../components/LeaderTile";

const DASHBOARD_LIST_LIMIT = 3;

function renderCardValue(value) {
  return `${value.yellow}Y / ${value.red}R`;
}

function renderRatingValue(value) {
  return value.toFixed(1);
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [games, setGames] = useState([]);
  const [cards, setCards] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [teamFilter, setTeamFilter] = useState(null);

  useEffect(() => {
    async function load() {
      const [teamsData, trainingsData, gamesData, cardsData, ratingsData] =
        await Promise.all([
          teamService.getAll(),
          trainingService.getAllNumbered(),
          gameService.getAll(),
          cardService.getAll(),
          ratingService.getAll(),
        ]);
      setTeams(teamsData);
      setTrainings(trainingsData);
      setGames(gamesData);
      setCards(cardsData);
      setRatings(ratingsData);
      setLoading(false);
    }
    load();
  }, []);

  function handleTeamFilterChange(e) {
    const value = e.target.value;
    if (value === "") {
      setTeamFilter(null);
      return;
    }
    const match = teams.find((t) => String(t.id) === value);
    setTeamFilter(match ? match.id : null);
  }

  const scopedTeams =
    teamFilter != null ? teams.filter((t) => t.id === teamFilter) : teams;
  const scopedTrainings =
    teamFilter != null ? trainings.filter((t) => t.teamId === teamFilter) : trainings;
  const scopedGames =
    teamFilter != null ? games.filter((g) => g.teamId === teamFilter) : games;
  const players = scopedTeams.flatMap((team) => team.players ?? []);

  const stats = counts({ teams, trainings, games }, teamFilter ?? undefined);
  const teamList = teamRows(scopedTeams, DASHBOARD_LIST_LIMIT);
  const now = new Date();
  const trainingList = upcomingRows(scopedTrainings, now, DASHBOARD_LIST_LIMIT, {
    dateField: "day",
  });
  const gameList = upcomingRows(scopedGames, now, DASHBOARD_LIST_LIMIT, {
    dateField: "date",
  });
  const scorers = topScorers(players, 3);
  const carded = topCarded(players, cards, 3);
  const teamGames = topTeamGames(scopedTeams, scopedGames, 3);
  const rated = topRated(players, ratings, 3);
  const upcoming = nextEvent(scopedTrainings, scopedGames, scopedTeams);

  const nextEventHref = upcoming
    ? upcoming.type === "training"
      ? `/trainings?training=${upcoming.sourceId}`
      : `/games?game=${upcoming.sourceId}`
    : undefined;

  return (
    <div className="flex flex-col gap-4 p-5 w-full">
      <label className="flex items-center gap-2 text-sm">
        Team
        <select
          className="border rounded px-2 py-1"
          value={teamFilter ?? ""}
          onChange={handleTeamFilterChange}
        >
          <option value="">All teams</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.club} {team.name}
            </option>
          ))}
        </select>
      </label>
      <section>
        <h2 className="text-lg font-semibold mb-2">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 auto-rows-fr gap-4">
          <ListTile
            label="Teams"
            count={stats.teams}
            rows={teamList.entries.map((team) => ({
              id: team.id,
              label: team.name,
              href: `/teams?team=${team.id}`,
            }))}
            overflow={teamList.overflow}
            loading={loading}
            emptyHref="/teams"
          />
          <ListTile
            label="Training"
            count={stats.trainings.total}
            breakdown={`${stats.trainings.past} past · ${stats.trainings.upcoming} upcoming`}
            rows={trainingList.entries.map((training) => ({
              id: training.id,
              label:
                training.number != null
                  ? `Training #${training.number} · ${formatTrainingDate(training.day)}`
                  : formatTrainingDate(training.day),
              href: `/trainings?training=${training.id}`,
            }))}
            overflow={trainingList.overflow}
            basis={trainingList.basis}
            loading={loading}
            emptyHref="/trainings"
          />
          <ListTile
            label="Games"
            count={stats.games.total}
            breakdown={`${stats.games.played} played · ${stats.games.upcoming} upcoming`}
            rows={gameList.entries.map((game) => ({
              id: game.id,
              label: `${homeAwayPrefix(game)} ${game.opponent} · ${formatGameDate(game.date)}`,
              href: `/games?game=${game.id}`,
            }))}
            overflow={gameList.overflow}
            basis={gameList.basis}
            loading={loading}
            emptyHref="/games"
          />
          <StatTile
            label="Next Event"
            value={upcoming ? upcoming.date.toLocaleString() : null}
            breakdown={upcoming ? `${upcoming.title} · ${upcoming.teamName}` : undefined}
            href={nextEventHref}
            loading={loading}
            emptyHref="/calendar"
            emptyLabel="No upcoming events"
            emptyLinkLabel="View calendar"
          />
        </div>
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-2">Leaders</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 auto-rows-fr gap-4">
          <LeaderTile label="Most Goals" data={scorers} loading={loading} />
          <LeaderTile
            label="Most Games"
            note="Team appearances, not individual"
            data={teamGames}
            loading={loading}
          />
          <LeaderTile
            label="Most Cards"
            data={carded}
            renderValue={renderCardValue}
            loading={loading}
          />
          <LeaderTile
            label="Top Rated"
            data={rated}
            renderValue={renderRatingValue}
            loading={loading}
          />
        </div>
      </section>
    </div>
  );
}
