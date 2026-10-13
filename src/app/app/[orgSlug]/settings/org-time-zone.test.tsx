import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * Settings cards that are client components print their dates in the org's
 * time zone, passed from the server. Formatted in the runtime's own zone,
 * the server (UTC) and a browser elsewhere disagree near midnight and React
 * reports a hydration mismatch.
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./danger/actions", () => ({ requestExportAction: vi.fn(), bootstrapCbcAction: vi.fn() }));
vi.mock("./integrations/actions", () => ({
  removeIntegrationAction: vi.fn(),
  testIntegrationAction: vi.fn(),
}));
vi.mock("./members/actions", () => ({ resendInvitation: vi.fn(), revokeInvitation: vi.fn() }));

const { ExportCard } = await import("./danger/export-card");
const { BootstrapCard } = await import("./danger/bootstrap-card");
const { StatusPanel } = await import("./integrations/integration-ui");
const { PendingInvites } = await import("./members/pending-invites");

// 03:30 UTC on 1 March is still 28 February in Los Angeles.
const AT = "2026-03-01T03:30:00.000Z";
const LA = "America/Los_Angeles";

describe("dates in settings use the org's time zone", () => {
  it("the export list", () => {
    const html = renderToStaticMarkup(
      <ExportCard
        orgId="org_1"
        orgSlug="cbc"
        expiryDays={7}
        timeZone={LA}
        exports={[
          {
            id: "e1",
            status: "READY",
            createdAt: AT,
            expiresAt: null,
            downloadCount: 0,
            requestedByName: null,
          },
        ]}
      />,
    );
    expect(html).toContain("Feb 28, 2026, 7:30 PM");
  });

  it("the CBC template's last run", () => {
    const html = renderToStaticMarkup(
      <BootstrapCard
        orgId="org_1"
        people={[]}
        members={[]}
        suggested={{}}
        bootstrappedAt={AT}
        timeZone={LA}
      />,
    );
    expect(html).toContain("Feb 28, 2026");
  });

  it("an integration's last check", () => {
    const html = renderToStaticMarkup(
      <StatusPanel
        secretLabel="API key"
        timeZone={LA}
        dto={{
          provider: "CLAUDE",
          status: "CONNECTED",
          last4: "abcd",
          hasSecret: true,
          lastVerifiedAt: AT,
          lastError: null,
          config: {},
          connectedByName: null,
          updatedAt: AT,
        }}
      />,
    );
    expect(html).toContain("Feb 28, 2026, 7:30 PM");
  });

  it("a pending invite's expiry", () => {
    const html = renderToStaticMarkup(
      <PendingInvites
        orgId="org_1"
        timeZone={LA}
        invites={[
          {
            id: "i1",
            email: "new@example.edu",
            role: "MEMBER",
            expiresAt: AT,
            expired: false,
            invitedByName: null,
          },
        ]}
      />,
    );
    expect(html).toContain("expires Feb 28");
  });
});
