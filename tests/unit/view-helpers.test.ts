import { describe, expect, it, vi } from "vitest";

import { ViewMatchMode } from "@/app/generated/prisma/client";

vi.mock("@/lib/db", () => ({
  db: {},
}));

import {
  buildCustomViewListRows,
  customViewMembershipWhere,
  listMatchesViewTags,
} from "@/trpc/routers/viewHelpers";

describe("view helper membership contract", () => {
  it("matches ALL custom views only when every required tag is present", () => {
    expect(listMatchesViewTags(["a", "b"], ["a", "b"], ViewMatchMode.ALL)).toBe(true);
    expect(listMatchesViewTags(["a"], ["a", "b"], ViewMatchMode.ALL)).toBe(false);
    expect(listMatchesViewTags([], ["a"], ViewMatchMode.ALL)).toBe(false);
  });

  it("matches ANY custom views when at least one required tag is present", () => {
    expect(listMatchesViewTags(["a"], ["a", "b"], ViewMatchMode.ANY)).toBe(true);
    expect(listMatchesViewTags(["b"], ["a", "b"], ViewMatchMode.ANY)).toBe(true);
    expect(listMatchesViewTags(["c"], ["a", "b"], ViewMatchMode.ANY)).toBe(false);
  });

  it("matches no custom lists when a view has zero required tags", () => {
    expect(listMatchesViewTags(["a"], [], ViewMatchMode.ALL)).toBe(false);
    expect(listMatchesViewTags(["a"], [], ViewMatchMode.ANY)).toBe(false);
    expect(customViewMembershipWhere("user-1", [], ViewMatchMode.ALL)).toBeNull();
    expect(customViewMembershipWhere("user-1", [], ViewMatchMode.ANY)).toBeNull();
  });

  it("builds ALL membership query shape with one condition per required tag", () => {
    expect(customViewMembershipWhere("user-1", ["a", "b"], ViewMatchMode.ALL)).toEqual({
      userId: "user-1",
      AND: [
        { listTags: { some: { tagId: "a" } } },
        { listTags: { some: { tagId: "b" } } },
      ],
    });
  });

  it("builds ANY membership query shape with one tag-in condition", () => {
    expect(customViewMembershipWhere("user-1", ["a", "b"], ViewMatchMode.ANY)).toEqual({
      userId: "user-1",
      listTags: {
        some: {
          tagId: { in: ["a", "b"] },
        },
      },
    });
  });

  it("preserves existing view order, falls back to All Lists order, then deterministic tail order", () => {
    const rows = buildCustomViewListRows({
      viewId: "view-1",
      matchingLists: [
        { id: "previous-order" },
        { id: "all-lists-order" },
        { id: "fallback-a" },
        { id: "fallback-b" },
      ],
      previousOrders: new Map([["previous-order", 20]]),
      allListOrders: new Map([["all-lists-order", 10]]),
    });

    expect(rows).toEqual([
      { viewId: "view-1", listId: "previous-order", order: 20 },
      { viewId: "view-1", listId: "all-lists-order", order: 10 },
      { viewId: "view-1", listId: "fallback-a", order: 21 },
      { viewId: "view-1", listId: "fallback-b", order: 22 },
    ]);
  });
});
