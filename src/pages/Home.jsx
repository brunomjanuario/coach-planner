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
} from "../lib/dashboardStats";
import StatTile from "../components/StatTile";
import LeaderTile from "../components/LeaderTile";

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
          trainingService.getAll(),
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
      <div className="grid grid-cols-3 gap-10">
        <StatTile
          label="Teams"
          value={stats.teams}
          loading={loading}
          emptyHref="/teams"
        />
        <StatTile
          label="Training"
          value={stats.trainings.total}
          breakdown={`${stats.trainings.past} past · ${stats.trainings.upcoming} upcoming`}
          loading={loading}
          emptyHref="/trainings"
        />
        <StatTile
          label="Games"
          value={stats.games.total}
          breakdown={`${stats.games.played} played · ${stats.games.upcoming} upcoming`}
          loading={loading}
          emptyHref="/games"
        />
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
        <LeaderTile
          label="Top Rated"
          data={rated}
          renderValue={renderRatingValue}
          loading={loading}
        />
      </div>
    </div>
  );
}
