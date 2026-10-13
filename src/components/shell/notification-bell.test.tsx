import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The bell refreshes every minute, but only while its tab is visible: a
 * background tab must not call the server action at all, and showing the
 * tab again refreshes once right away.
 */

const mocks = vi.hoisted(() => ({ fetchMyNotifications: vi.fn() }));

vi.mock("@/app/app/notifications-actions", () => ({
  fetchMyNotifications: mocks.fetchMyNotifications,
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const { NotificationBell } = await import("./notification-bell");

const MINUTE = 60_000;
let hidden = false;

async function setHidden(next: boolean) {
  hidden = next;
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

async function wait(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function mount() {
  await act(async () => {
    render(<NotificationBell />);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  mocks.fetchMyNotifications.mockReset();
  mocks.fetchMyNotifications.mockResolvedValue({ notifications: [], unreadCount: 0 });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  delete (document as { hidden?: boolean }).hidden;
});

describe("NotificationBell polling", () => {
  it("polls every minute while visible, never while hidden, and once on coming back", async () => {
    await mount();
    expect(mocks.fetchMyNotifications).toHaveBeenCalledTimes(1);
    await wait(MINUTE);
    expect(mocks.fetchMyNotifications).toHaveBeenCalledTimes(2);

    await setHidden(true);
    await wait(10 * MINUTE);
    expect(mocks.fetchMyNotifications).toHaveBeenCalledTimes(2);

    await setHidden(false);
    expect(mocks.fetchMyNotifications).toHaveBeenCalledTimes(3);
    // The clock restarts from the catch-up refresh.
    await wait(MINUTE - 1);
    expect(mocks.fetchMyNotifications).toHaveBeenCalledTimes(3);
    await wait(1);
    expect(mocks.fetchMyNotifications).toHaveBeenCalledTimes(4);
  });

  it("waits for a tab opened in the background to be shown", async () => {
    hidden = true;
    await mount();
    await wait(5 * MINUTE);
    expect(mocks.fetchMyNotifications).not.toHaveBeenCalled();
    await setHidden(false);
    expect(mocks.fetchMyNotifications).toHaveBeenCalledTimes(1);
  });

  it("stops polling once unmounted", async () => {
    await mount();
    cleanup();
    await wait(5 * MINUTE);
    await setHidden(false);
    expect(mocks.fetchMyNotifications).toHaveBeenCalledTimes(1);
  });
});
