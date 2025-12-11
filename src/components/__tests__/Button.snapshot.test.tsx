import { render } from "@testing-library/react";
import Button from "../Button";

test("Button snapshot", () => {
  const { container } = render(<Button variant="primary">Snapshot</Button>);
  expect(container).toMatchSnapshot();
});
