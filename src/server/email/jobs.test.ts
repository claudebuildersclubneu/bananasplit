// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * notify-email outcomes. A job that sends nothing must say why in the Job
 * row (CANCELLED with a reason), never finish DONE as if an email went out:
 * that silent DONE is what made "no email sender for this org" invisible.
 */

const db = vi.hoisted(() => ({
  notification: { findFirst: vi.fn(), updateMany: vi.fn() },
}));

vi.mock("@/server/db/context", () => ({
  withSystemOrgTx: vi.fn(async (_orgId: string, fn: (ctx: unknown) => unknown) => fn({ db })),
}));
vi.mock("@/server/db/clients", () => ({ authDb: {} }));
vi.mock("@/server/tasks/email", () => ({ renderTaskNotificationEmail: vi.fn(async () => null) }));
vi.mock("./mailer", () => ({ getOrgMailer: vi.fn(), getPlatformMailer: vi.fn() }));

const { notifyEmailJob } = await import("./jobs");
const { getOrgMailer } = await import("./mailer");

const run = {
  id: "j1",
  kind: "notify-email",
  organizationId: "org1",
  payload: { notificationId: "n1" },
  dedupeKey: "notify-email:n1",
  attempt: 1,
  maxAttempts: 8,
  signal: new AbortController().signal,
  deadline: Date.now() + 20_000,
};

function notification(emailPreferences: unknown = {}) {
  return {
    userId: "u1",
    type: "TASK_ASSIGNED",
    title: "Oliver assigned you a task",
    body: null,
    linkUrl: "/app/cbc/tasks/t1",
    emailSentAt: null,
    taskId: null,
    actorId: null,
    dedupeKey: null,
    user: { email: "member@example.edu", emailPreferences },
    organization: { name: "CBC" },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.notification.findFirst.mockResolvedValue(notification());
  db.notification.updateMany.mockResolvedValue({ count: 1 });
});

describe("notifyEmailJob", () => {
  it("cancels with a reason, and logs it, when the org has no email sender", async () => {
    vi.mocked(getOrgMailer).mockResolvedValue(null);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await notifyEmailJob(run)).toEqual({
      status: "CANCELLED",
      error: "no email sender for this org (in-app only)",
    });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("org org1 has no email sender"));
    expect(db.notification.updateMany).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("cancels without looking for a sender when the recipient turned the email off", async () => {
    db.notification.findFirst.mockResolvedValue(notification({ TASK_ASSIGNED: false }));
    expect(await notifyEmailJob(run)).toEqual({
      status: "CANCELLED",
      error: "the recipient turned this email off",
    });
    expect(getOrgMailer).not.toHaveBeenCalled();
  });

  it("claims the notification and sends through the org's mailer", async () => {
    const send = vi.fn(async () => ({ id: "re_1", transport: "live" as const }));
    vi.mocked(getOrgMailer).mockResolvedValue({
      kind: "platform-fallback",
      from: "CBC via CBC Portal <no-reply@example.org>",
      label: "the platform sender",
      send,
    });
    expect(await notifyEmailJob(run)).toBeUndefined();
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "member@example.edu" }),
      expect.objectContaining({ idempotencyKey: "notify-email-n1" }),
    );
  });
});
