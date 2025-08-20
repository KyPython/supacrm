import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "../Button";

describe("Button", () => {
  test("renders primary button and responds to click", async () => {
    const handle = jest.fn();
    render(<Button onClick={handle}>Click me</Button>);
    const btn = screen.getByRole("button", { name: /click me/i });
    await userEvent.click(btn);
    expect(handle).toHaveBeenCalledTimes(1);
  });

  test("disabled button is not clickable", async () => {
    const handle = jest.fn();
    render(
      <Button onClick={handle} disabled>
        Disabled
      </Button>
    );
    const btn = screen.getByRole("button", { name: /disabled/i });
    await userEvent.click(btn);
    expect(handle).not.toHaveBeenCalled();
  });
});
