import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { SubmitPill } from "./submit-pill";

/**
 * "Confirm email" spends a single-use link: while its post is on the way the
 * button is disabled, so a double click can't send it twice.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement | null = null;

afterEach(() => {
  container?.remove();
  container = null;
});

describe("SubmitPill", () => {
  it("is disabled, with its pending label, until the form's action finishes", async () => {
    let finish!: () => void;
    let posts = 0;
    const action = () => {
      posts += 1;
      return new Promise<void>((resolve) => (finish = resolve));
    };

    container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <form action={action}>
          <SubmitPill pendingLabel="Confirming…">Confirm email</SubmitPill>
        </form>,
      );
    });

    const button = container.querySelector("button")!;
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe("Confirm email");

    await act(async () => {
      button.click();
    });
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe("Confirming…");

    // A second click while it posts does nothing.
    await act(async () => {
      button.click();
    });
    expect(posts).toBe(1);

    await act(async () => {
      finish();
    });
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe("Confirm email");
    root.unmount();
  });
});
