import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "../Button";
import { HiOutlinePlus } from "react-icons/hi";

describe("Button variants", () => {
  test("secondary snapshot and click", async () => {
    const handle = jest.fn();
    render(
      <Button variant="secondary" onClick={handle}>
        Secondary
      </Button>
    );
    const btn = screen.getByRole("button", { name: /secondary/i });
    await userEvent.click(btn);
    expect(handle).toHaveBeenCalled();
  });

  test("ghost anchor renders as link", () => {
    const { container } = render(
      <Button href="/test" variant="ghost">
        Link
      </Button>
    );
    expect(container).toMatchSnapshot();
  });

  test("left and right icons render", () => {
    const { container } = render(
      <Button leftIcon={HiOutlinePlus} rightIcon={<span>R</span>}>
        WithIcons
      </Button>
    );
    expect(container).toMatchSnapshot();
  });
});
