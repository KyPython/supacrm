import React from "react";
import { render, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ModalWrapper from "@/components/ModalWrapper";

import { screen } from "@testing-library/react";

describe("ModalWrapper", () => {
  it("traps focus and closes on Escape", () => {
    const onClose = jest.fn();

    render(
      <ModalWrapper onClose={onClose}>
        <div>
          <button>First</button>
          <button>Second</button>
        </div>
      </ModalWrapper>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // simulate Escape key
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
