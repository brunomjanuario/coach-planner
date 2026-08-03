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

  const players = teams.flatMap((team) => team.players ?? []);
  const stats = counts({ teams, trainings, games });
  const scorers = topScorers(players, 3);
  const carded = topCarded(players, cards, 3);
  const teamGames = topTeamGames(teams, games, 3);
  const rated = topRated(players, ratings, 3);
  const upcoming = nextEvent(trainings, games, teams);

  const nextEventHref = upcoming
    ? upcoming.type === "training"
      ? `/trainings?training=${upcoming.sourceId}`
      : `/games?game=${upcoming.sourceId}`
    : undefined;

  return (
    <div className="grid grid-cols-3 gap-10 p-5 w-full">
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
  );
}
