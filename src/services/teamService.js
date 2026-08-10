import { getCollection, setCollection } from "./store";
import { newId } from "../lib/id";
import { NotFoundError } from "../lib/errors";
import { cardService } from "./cardService";
import { ratingService } from "./ratingService";

function getTeams() {
  return getCollection("teams");
}

function saveTeams(teams) {
  setCollection("teams", teams);
}

export const teamService = {
  getAll: async () => {
    return getTeams();
  },

  getById: async (id) => {
    const teams = getTeams();
    return teams.find((team) => team.id === id) ?? null;
  },

  create: async (teamData) => {
    const teams = getTeams();
    const newTeam = { ...teamData, id: newId() };
    teams.push(newTeam);
    saveTeams(teams);
    return newTeam;
  },

  update: async (teamData) => {
    const teams = getTeams();
    const index = teams.findIndex((team) => team.id === teamData.id);
    if (index === -1) {
      throw new NotFoundError(`Team not found: ${teamData.id}`);
    }
    teams[index] = { ...teams[index], ...teamData };
    saveTeams(teams);
    return teams[index];
  },

  /**
   * Deletes a team and cascades to its players' cards and ratings, mirroring
   * deletePlayer's own cascade — otherwise every card/rating belonging to a
   * deleted team's players becomes permanently unreachable, quietly growing
   * storage toward AD-002's ~5MB ceiling. Games are deliberately left
   * untouched: gameService.getUnassigned already treats a dangling teamId
   * as reassignable, not orphaned.
   */
  delete: async (id) => {
    const teams = getTeams();
    const team = teams.find((t) => t.id === id);
    saveTeams(teams.filter((t) => t.id !== id));

    if (team) {
      await Promise.all(
        team.players.map((player) =>
          Promise.all([
            cardService.removeByPlayer(player.id),
            ratingService.removeByPlayer(player.id),
          ])
        )
      );
    }
  },

  addPlayer: async (teamId, playerData) => {
    const teams = getTeams();
    const team = teams.find((team) => team.id === teamId);
    if (!team) {
      throw new NotFoundError(`Team not found: ${teamId}`);
    }
    const newPlayer = { ...playerData, teamId, id: newId() };
    team.players.push(newPlayer);
    saveTeams(teams);
    return newPlayer;
  },

  updatePlayer: async (playerData) => {
    const teams = getTeams();
    const team = teams.find((team) => team.id === playerData.teamId);
    if (!team) {
      throw new NotFoundError(`Team not found: ${playerData.teamId}`);
    }
    const playerIndex = team.players.findIndex(
      (player) => player.id === playerData.id
    );
    if (playerIndex === -1) {
      throw new NotFoundError(`Player not found: ${playerData.id}`);
    }
    team.players[playerIndex] = {
      ...team.players[playerIndex],
      ...playerData,
    };
    saveTeams(teams);
    return team.players[playerIndex];
  },

  deletePlayer: async (playerData) => {
    const teams = getTeams();
    const team = teams.find((team) => team.id === playerData.teamId);
    if (!team) {
      throw new NotFoundError(`Team not found: ${playerData.teamId}`);
    }
    team.players = team.players.filter(
      (player) => player.id !== playerData.id
    );
    saveTeams(teams);
    await cardService.removeByPlayer(playerData.id);
    await ratingService.removeByPlayer(playerData.id);
  },
};
