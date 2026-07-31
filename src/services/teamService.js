import { getCollection, setCollection } from "./store";
import { newId } from "../lib/id";
import { NotFoundError } from "../lib/errors";

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

  delete: async (id) => {
    const teams = getTeams().filter((team) => team.id !== id);
    saveTeams(teams);
  },

  addPlayer: async (teamId, playerData) => {
    const teams = getTeams();
    const team = teams.find((team) => team.id === teamId);
    team.players.push(playerData);
    saveTeams(teams);
  },

  updatePlayer: async (playerData) => {
    const teams = getTeams();
    const team = teams.find((team) => team.id === playerData.teamId);
    const player = team.players.find((player) => player.id === playerData.id);
    player.age = playerData.age;
    player.name = playerData.name;
    player.shirtNumber = playerData.shirtNumber;
    player.position = playerData.position;
    saveTeams(teams);
  },

  deletePlayer: async (playerData) => {
    const teams = getTeams();
    const team = teams.find((team) => team.id === playerData.teamId);
    const newList = team.players.filter(
      (player) => player.id !== playerData.id
    );
    team.players = newList;
    saveTeams(teams);
  },
};
