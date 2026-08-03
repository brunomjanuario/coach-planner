import { useState, useEffect } from "react";
import { teamService } from "../services/teamService";
import { trainingService } from "../services/trainingService";
import { gameService } from "../services/gameService";
import { counts } from "../lib/dashboardStats";
import StatTile from "../components/StatTile";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [games, setGames] = useState([]);

  useEffect(() => {
    async function load() {
      const [teamsData, trainingsData, gamesData] = await Promise.all([
        teamService.getAll(),
        trainingService.getAll(),
        gameService.getAll(),
      ]);
      setTeams(teamsData);
      setTrainings(trainingsData);
      setGames(gamesData);
      setLoading(false);
    }
    load();
  }, []);

  const stats = counts({ teams, trainings, games });

  return (
    <div className="grid grid-cols-3 grid-rows-2 gap-10 p-5 w-full">
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
      <div className="w-full border px-3 py-2 rounded-2xl">Most Goals</div>
      <div className="w-full border px-3 py-2 rounded-2xl">Most Games</div>
      <div className="w-full border px-3 py-2 rounded-2xl">Most Cards</div>
    </div>
  );
}
