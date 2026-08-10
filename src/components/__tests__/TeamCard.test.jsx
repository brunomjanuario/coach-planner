import { render, screen } from "@testing-library/react";
import TeamCard from "../TeamCard";

const team = {
  id: 1,
  name: "Sub-11",
  club: "Amadora",
  season: "23/24",
  players: [],
};

test("renders the crest image via an imported asset, not a raw source-tree path (AC ASSET-01.2)", () => {
  render(<TeamCard team={team} onClose={() => {}} onUpdated={() => {}} />);

  const img = screen.getByRole("img", { name: "Amadora Sub-11 crest" });
  expect(img).toHaveAttribute("src");
  expect(img.getAttribute("src")).not.toBe("src/assets/images/logo.png");
});

test("the crest image has descriptive alt text naming the team (AC ASSET-01.3)", () => {
  render(<TeamCard team={team} onClose={() => {}} onUpdated={() => {}} />);

  expect(
    screen.getByAltText("Amadora Sub-11 crest")
  ).toBeInTheDocument();
});
