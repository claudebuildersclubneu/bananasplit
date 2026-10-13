import { describe, expect, it } from "vitest";

import { buildTransactionWhere, parseTransactionFilters } from "./queries";

const from = (params: Record<string, string>) => (key: string) => params[key];

describe("parseTransactionFilters", () => {
  it("ignores hand-edited values instead of passing them to the database", () => {
    const filters = parseTransactionFilters(
      from({ kind: "BRIBE", status: "PAID", dateFrom: "not-a-date", dateTo: "2026-02-30" }),
    );
    expect(filters).toMatchObject({
      kind: undefined,
      status: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    });
    expect(() => buildTransactionWhere("org1", filters)).not.toThrow();
  });

  it("keeps real kinds, statuses and dates", () => {
    expect(
      parseTransactionFilters(
        from({
          kind: "EXPENSE",
          status: "SUBMITTED",
          dateFrom: "2026-09-01",
          dateTo: "2026-09-21T12:00:00.000Z",
        }),
      ),
    ).toMatchObject({
      kind: "EXPENSE",
      status: "SUBMITTED",
      dateFrom: "2026-09-01",
      dateTo: "2026-09-21T12:00:00.000Z",
    });
  });

  it("shows the default period unless the URL picks one, all, or a date range", () => {
    expect(parseTransactionFilters(from({}), "active").budgetPeriodId).toBe("active");
    expect(parseTransactionFilters(from({ period: "p2" }), "active").budgetPeriodId).toBe("p2");
    expect(
      parseTransactionFilters(from({ period: "all" }), "active").budgetPeriodId,
    ).toBeUndefined();
    expect(
      parseTransactionFilters(from({ dateFrom: "2025-01-01" }), "active").budgetPeriodId,
    ).toBeUndefined();
    // The CSV export passes no default: every period.
    expect(parseTransactionFilters(from({})).budgetPeriodId).toBeUndefined();
  });
});

describe("buildTransactionWhere", () => {
  it("includes the whole of a date-only end day, whatever the time", () => {
    const where = buildTransactionWhere("org1", { dateFrom: "2026-09-21", dateTo: "2026-09-21" });
    expect(where.occurredAt).toEqual({
      gte: new Date("2026-09-21T00:00:00.000Z"),
      lt: new Date("2026-09-22T00:00:00.000Z"),
    });
  });

  it("reads a full timestamp end as that instant", () => {
    const where = buildTransactionWhere("org1", { dateTo: "2026-09-21T12:00:00.000Z" });
    expect(where.occurredAt).toEqual({ lte: new Date("2026-09-21T12:00:00.000Z") });
  });
});
