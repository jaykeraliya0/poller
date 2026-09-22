import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { makeOptions } from "@/tests/fixtures/insights";
import { rankingVoteUI } from "./vote-input";

const options = makeOptions(["Dark mode", "Offline", "CSV export"]);

function Harness({ rankTop }: { rankTop: number | null }) {
  const [value, setValue] = useState<unknown>(rankingVoteUI.emptyAnswers(options));
  const { VoteInput } = rankingVoteUI;
  const config = { rankTop };
  return (
    <>
      <VoteInput config={config} options={options} value={value} onChange={setValue} errors={{}} newOptionIds={new Set()} />
      <output data-testid="value">{JSON.stringify(value)}</output>
      <p data-testid="progress">{rankingVoteUI.progress(value, options, config)}</p>
    </>
  );
}

const ranking = () => JSON.parse(screen.getByTestId("value").textContent!).ranking;

describe("ranking vote input", () => {
  it("ranks options in the order they're tapped, then reorders and removes", async () => {
    const user = userEvent.setup();
    render(<Harness rankTop={null} />);

    await user.click(screen.getByRole("button", { name: /CSV export/ }));
    await user.click(screen.getByRole("button", { name: /Dark mode/ }));
    expect(ranking()).toEqual(["opt-3", "opt-1"]);
    expect(screen.getByText("Dark mode ranked 2")).toBeInTheDocument();
    expect(screen.getByTestId("progress")).toHaveTextContent("2 of 3 ranked");

    await user.click(screen.getByRole("button", { name: "Move Dark mode up" }));
    expect(ranking()).toEqual(["opt-1", "opt-3"]);

    await user.click(screen.getByRole("button", { name: "Remove CSV export from ranking" }));
    expect(ranking()).toEqual(["opt-1"]);
  });

  it("stops adding once the top N are ranked", async () => {
    const user = userEvent.setup();
    render(<Harness rankTop={2} />);
    await user.click(screen.getByRole("button", { name: /Offline/ }));
    await user.click(screen.getByRole("button", { name: /Dark mode/ }));
    expect(screen.getByRole("button", { name: /CSV export/ })).toBeDisabled();
    expect(screen.getByTestId("progress")).toHaveTextContent("2 of 2 ranked");
  });
});
