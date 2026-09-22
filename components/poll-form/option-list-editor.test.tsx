import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import type { FieldErrors } from "@/lib/errors";
import { OptionListEditor, newLabelDraft, type LabelDraft } from "./option-list-editor";

function Harness({ initial, errors = {}, max }: { initial: string[]; errors?: FieldErrors; max?: number }) {
  const [options, setOptions] = useState<LabelDraft[]>(() => initial.map((label) => newLabelDraft(label)));
  return (
    <>
      <OptionListEditor options={options} onChange={setOptions} errors={errors} max={max} />
      <output data-testid="labels">{options.map((o) => o.label).join("|")}</output>
    </>
  );
}

const labels = () => screen.getByTestId("labels").textContent;

describe("OptionListEditor", () => {
  it("edits, adds and removes options", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["Pizza", "Sushi"]} />);

    await user.type(screen.getByLabelText("Option 2"), " bar");
    await user.click(screen.getByRole("button", { name: "Add option" }));
    await user.type(screen.getByLabelText("Option 3"), "Tacos");
    expect(labels()).toBe("Pizza|Sushi bar|Tacos");

    await user.click(screen.getByRole("button", { name: "Remove option 1" }));
    expect(labels()).toBe("Sushi bar|Tacos");
  });

  it("adds a new option when pressing Enter on the last one and focuses it", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["A", "B"]} />);
    await user.type(screen.getByLabelText("Option 2"), "{Enter}");
    expect(labels()).toBe("A|B|");
    await user.keyboard("C");
    expect(labels()).toBe("A|B|C");
  });

  it("reorders with the move buttons", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["A", "B", "C"]} />);
    await user.click(screen.getByRole("button", { name: "Move option 3 up" }));
    expect(labels()).toBe("A|C|B");
    expect(screen.getByRole("button", { name: "Move option 1 up" })).toBeDisabled();
  });

  it("keeps the minimum number of options and stops at the maximum", () => {
    render(<Harness initial={["A", "B", "C"]} max={3} />);
    expect(screen.getByRole("button", { name: "Add option" })).toBeDisabled();
    expect(screen.getByText("3/3")).toBeInTheDocument();
  });

  it("disables removal at the minimum", () => {
    render(<Harness initial={["A", "B"]} />);
    expect(screen.getByRole("button", { name: "Remove option 1" })).toBeDisabled();
  });

  it("shows errors next to the right option", () => {
    render(<Harness initial={["A", "a"]} errors={{ "options.1.label": ["Duplicate option"] }} />);
    expect(screen.getByLabelText("Option 2")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Option 2")).toHaveAccessibleDescription("Duplicate option");
    expect(screen.getByLabelText("Option 1")).not.toHaveAttribute("aria-invalid");
  });
});
