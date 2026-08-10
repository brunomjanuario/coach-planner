import { useEffect, useState } from "react";
import { opponentService } from "../services/opponentService";
import { competitionService } from "../services/competitionService";
import { gameService } from "../services/gameService";
import Button from "./Button";
import PopupActions from "./PopupActions";
import PopupShell from "./PopupShell";
import ReferenceListManager from "./ReferenceListManager";
import Tabs from "./Tabs";

const OPPONENT_NOUNS = { singular: "opponent", plural: "opponents" };
const COMPETITION_NOUNS = { singular: "competition", plural: "competitions" };

function normalize(name) {
  return name.trim().toLowerCase();
}

async function countUsage(field, item) {
  const games = await gameService.getAll();
  const target = normalize(item.name);
  return games.filter(
    (game) => typeof game[field] === "string" && normalize(game[field]) === target
  ).length;
}

/**
 * Hosts the Opponents and Competitions managers as tabs of one popup
 * (feature 30) — each tab wires ReferenceListManager to its own service and
 * counts usage from its own game field, so the two lists stay independent.
 */
export default function ReferenceListsPopup({ onClose, initialTab = "opponents" }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [opponents, setOpponents] = useState([]);
  const [competitions, setCompetitions] = useState([]);

  const loadOpponents = async () => setOpponents(await opponentService.getAll());
  const loadCompetitions = async () => setCompetitions(await competitionService.getAll());

  useEffect(() => {
    loadOpponents();
    loadCompetitions();
  }, []);

  const tabs = [
    {
      id: "opponents",
      label: "Opponents",
      panel: (
        <ReferenceListManager
          key="opponents"
          items={opponents}
          nouns={OPPONENT_NOUNS}
          onCreate={async (name) => {
            await opponentService.create(name);
            await loadOpponents();
          }}
          onRename={async ({ id, name }) => {
            await opponentService.update({ id, name });
            await loadOpponents();
          }}
          onDelete={async (id) => {
            await opponentService.delete(id);
            await loadOpponents();
          }}
          usageCount={(item) => countUsage("opponent", item)}
        />
      ),
    },
    {
      id: "competitions",
      label: "Competitions",
      panel: (
        <ReferenceListManager
          key="competitions"
          items={competitions}
          nouns={COMPETITION_NOUNS}
          onCreate={async (name) => {
            await competitionService.create(name);
            await loadCompetitions();
          }}
          onRename={async ({ id, name }) => {
            await competitionService.update({ id, name });
            await loadCompetitions();
          }}
          onDelete={async (id) => {
            await competitionService.delete(id);
            await loadCompetitions();
          }}
          usageCount={(item) => countUsage("competition", item)}
        />
      ),
    },
  ];

  return (
    <PopupShell
      title="Manage lists"
      footer={
        <PopupActions>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </PopupActions>
      }
    >
      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
    </PopupShell>
  );
}
