/**
 * Renders standings rows in the order given — sortStandings has already run
 * by the time rows reach this component (design.md: "the component does
 * not call sortStandings itself"). Position numbers are 1-based render
 * order. Our row (row.isOurs) is visually highlighted.
 */
export default function LeagueTable({ rows }) {
  return (
    <div className="overflow-x-auto rounded border">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="px-2 py-1">#</th>
            <th className="px-2 py-1">Team</th>
            <th className="px-2 py-1">P</th>
            <th className="px-2 py-1">W</th>
            <th className="px-2 py-1">D</th>
            <th className="px-2 py-1">L</th>
            <th className="px-2 py-1">GF</th>
            <th className="px-2 py-1">GA</th>
            <th className="px-2 py-1">GD</th>
            <th className="px-2 py-1">Pts</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((row, index) => (
            <tr
              key={`${row.name}-${index}`}
              className={row.isOurs ? "bg-blue-500/20 font-semibold" : ""}
            >
              <td className="px-2 py-1">{index + 1}</td>
              <td className="px-2 py-1 break-words">{row.name}</td>
              <td className="px-2 py-1">{row.played}</td>
              <td className="px-2 py-1">{row.won}</td>
              <td className="px-2 py-1">{row.drawn}</td>
              <td className="px-2 py-1">{row.lost}</td>
              <td className="px-2 py-1">{row.goalsFor}</td>
              <td className="px-2 py-1">{row.goalsAgainst}</td>
              <td className="px-2 py-1">{row.goalDifference}</td>
              <td className="px-2 py-1">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
