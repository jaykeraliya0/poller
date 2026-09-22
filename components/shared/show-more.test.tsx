import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ShowMore } from "./show-more";

const list = (items: number[]) => (
  <ul>
    {items.map((item) => (
      <li key={item}>Item {item}</li>
    ))}
  </ul>
);

describe("ShowMore", () => {
  it("renders everything when under the limit", () => {
    render(<ShowMore items={[1, 2]} initial={3} noun="items" render={list} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByText(/Show/)).not.toBeInTheDocument();
  });

  it("tucks the rest behind a disclosure that reveals them", async () => {
    const user = userEvent.setup();
    render(<ShowMore items={[1, 2, 3, 4, 5]} initial={2} noun="comments" render={list} />);
    expect(screen.getByText("Item 3")).not.toBeVisible();
    await user.click(screen.getByText("Show 3 more comments"));
    expect(screen.getByText("Item 3")).toBeVisible();
  });
});
