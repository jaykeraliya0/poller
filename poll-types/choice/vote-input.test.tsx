import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { makeOptions } from "@/tests/fixtures/insights";
import { choiceVoteUI } from "./vote-input";

const options = makeOptions(["Testing", "Postgres", "Accessibility"]);

function Harness({ config }: { config: object }) {
  const [value, setValue] = useState<unknown>(choiceVoteUI.emptyAnswers(options));
  const { VoteInput } = choiceVoteUI;
  return (
    <>
      <VoteInput config={config} options={options} value={value} onChange={setValue} errors={{}} newOptionIds={new Set(["opt-3"])} />
      <output>{choiceVoteUI.progress(value, options, config)}</output>
    </>
  );
}

describe("choice vote input", () => {
  it("allows exactly one pick on single choice", async () => {
    const user = userEvent.setup();
    render(<Harness config={{ multi: false, maxSelections: null }} />);
    await user.click(screen.getByRole("radio", { name: /Testing/ }));
    await user.click(screen.getByRole("radio", { name: /Postgres/ }));
    expect(screen.getByRole("radio", { name: /Postgres/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Testing/ })).not.toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent("1 option picked");
  });

  it("disables unpicked options once the maximum is reached", async () => {
    const user = userEvent.setup();
    render(<Harness config={{ multi: true, maxSelections: 2 }} />);
    expect(screen.getByText("Pick up to 2.")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /Testing/ }));
    await user.click(screen.getByRole("checkbox", { name: /Postgres/ }));
    // Base UI checkboxes are role="checkbox" elements, disabled via aria-disabled.
    const third = screen.getByRole("checkbox", { name: /Accessibility/ });
    expect(third).toHaveAttribute("aria-disabled", "true");
    await user.click(third);
    expect(third).not.toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent("2 of 2 picked");

    await user.click(screen.getByRole("checkbox", { name: /Testing/ }));
    expect(screen.getByRole("checkbox", { name: /Accessibility/ })).not.toHaveAttribute("aria-disabled");
  });

  it("flags options added since the voter last voted", () => {
    render(<Harness config={{ multi: false, maxSelections: null }} />);
    expect(screen.getByRole("radio", { name: /Accessibility/ })).toHaveAccessibleName(/New/);
  });
});
