import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CheckoutForm, type CheckoutFormProps } from "./checkout-form";

/**
 * Checkout before billing exists: the seat stepper prices the order, and
 * Subscribe only says payments aren't connected. The card fields stand in
 * for Stripe's Payment Element, so none of them may ever be submitted.
 */

const props: CheckoutFormProps = {
  plan: "society",
  clubName: "Robotics Club",
  initialMembers: 2,
  email: "maya@westfield.edu",
  backHref: "/app/robotics/settings/general",
  backLabel: "Bananasplit, back to club settings",
  renewsOn: "Jan 12, 2027",
  renewsFor: "spring",
};

afterEach(() => {
  cleanup();
});

describe("CheckoutForm", () => {
  it("prices the seats and never goes below one member", () => {
    render(<CheckoutForm {...props} />);
    expect(screen.getByRole("heading", { name: "Subscribe to Team Advanced" })).toBeTruthy();
    expect(screen.getAllByText("$14.00")).toHaveLength(4);

    fireEvent.click(screen.getByRole("button", { name: "More members" }));
    expect(screen.getAllByText("$21.00")).toHaveLength(4);

    for (let i = 0; i < 5; i++)
      fireEvent.click(screen.getByRole("button", { name: "Fewer members" }));
    expect(screen.getAllByText("$7.00")).toHaveLength(4);
  });

  it("prices Team (?plan=club) at $4 a member, with thousands separators", () => {
    render(<CheckoutForm {...props} plan="club" initialMembers={300} />);
    expect(screen.getByRole("heading", { name: "Subscribe to Team" })).toBeTruthy();
    expect(screen.getByText("Team · Robotics Club")).toBeTruthy();
    expect(screen.getAllByText("$1,200.00")).toHaveLength(4);
  });

  it("sells Personal Plus yearly by default, or monthly, with no seats", () => {
    render(<CheckoutForm {...props} plan="plus" />);
    expect(screen.getByRole("heading", { name: "Subscribe to Personal Plus" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "More members" })).toBeNull();
    expect(screen.getAllByText("$36.00")).toHaveLength(3);
    expect(screen.getByText(/Yearly saves \$12\.00/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));
    expect(screen.getAllByText("$4.00")).toHaveLength(3);
    expect(screen.queryByText("$36.00")).toBeNull();
  });

  it("does not submit: Subscribe says card payments aren't connected", () => {
    render(<CheckoutForm {...props} />);
    // The seat count is an <output> (a status too); the notice is the <p>.
    const status = screen.getAllByRole("status").find((el) => el.tagName === "P");
    expect(status?.textContent).toBe("");

    const submit = new Event("submit", { bubbles: true, cancelable: true });
    fireEvent(screen.getByRole("form", { name: "Pay with card" }), submit);
    expect(submit.defaultPrevented).toBe(true);
    expect(status?.textContent).toBe("Card payments aren't connected yet, so nothing was charged.");
  });

  it("gives the card fields no names and labels every field", () => {
    const { container } = render(<CheckoutForm {...props} />);
    for (const field of container.querySelectorAll("input, select")) {
      expect(field.getAttribute("name")).toBeNull();
    }
    for (const name of [
      "Email",
      "Card number",
      "Expiration date (MM / YY)",
      "Security code (CVC)",
      "Cardholder name",
      "Country or region",
      "ZIP",
    ]) {
      expect(screen.getByLabelText(name)).toBeTruthy();
    }
    expect(screen.getByRole("group", { name: "Card information" })).toBeTruthy();
  });
});
