import { describe, expect, it } from "vitest";

import { listMatchesView, projectView, selectedViewFromCache } from "@/lib/dashboard-cache";

const tag = (id: string, name = id) => ({
  id,
  name,
  color: "gray" as const,
  userId: "user-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  listTags: [],
});

const list = (id: string, tagIds: string[] = [], order = 0) => ({
  id,
  userId: "user-1",
  name: id,
  order,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  listItems: [],
  listTags: tagIds.map((tagId) => ({
    listId: id,
    tagId,
    tag: tag(tagId),
  })),
});

const view = (overrides = {}) => ({
  id: "view-1",
  name: "View",
  userId: "user-1",
  order: 0,
  type: "CUSTOM" as const,
  isDefault: false,
  matchMode: "ALL" as const,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  viewTags: [
    { viewId: "view-1", tagId: "a", tag: tag("a") },
    { viewId: "view-1", tagId: "b", tag: tag("b") },
  ],
  viewLists: [],
  ...overrides,
});

describe("dashboard cache projection", () => {
  // Expected-failing reproduction tests for follow-up projection phases.
  // Keep assertions intact: 1.4.1/1.4.2 should make these pass by fixing projection behavior.
  it.fails("ANY custom matching includes lists with at least one required tag", () => {
    const customView = view({ matchMode: "ANY" as const });

    expect(listMatchesView(list("has-a", ["a"]), customView)).toBe(true);
    expect(listMatchesView(list("has-b", ["b"]), customView)).toBe(true);
    expect(listMatchesView(list("has-both", ["a", "b"]), customView)).toBe(true);
    expect(listMatchesView(list("missing-all", []), customView)).toBe(false);
  });

  it("ALL custom matching excludes lists missing any required view tag", () => {
    const customView = view();

    expect(listMatchesView(list("match", ["a", "b"]), customView)).toBe(true);
    expect(listMatchesView(list("missing-one", ["a"]), customView)).toBe(false);
    expect(listMatchesView(list("missing-all", []), customView)).toBe(false);
  });

  it("custom views with no required tags match no lists", () => {
    expect(listMatchesView(list("untagged"), view({ viewTags: [] }))).toBe(false);
  });

  it("projects all lists without filtering", () => {
    const allListsView = view({ type: "ALL_LISTS" as const, viewTags: [] });
    const snapshot = { view: allListsView, lists: [list("a"), list("b")] };

    expect(projectView(allListsView, snapshot)?.lists.map((entry) => entry.id)).toEqual(["a", "b"]);
  });

  it("projects custom views by filtering and ViewList order with list order fallback", () => {
    const customView = view({
      viewLists: [
        { listId: "first", order: 20 },
        { listId: "second", order: 10 },
      ],
    });
    const snapshot = {
      view: view({ type: "ALL_LISTS" as const, viewTags: [] }),
      lists: [
        list("first", ["a", "b"], 0),
        list("hidden", ["a"], 0),
        list("fallback", ["a", "b"], 15),
        list("second", ["a", "b"], 0),
      ],
    };

    expect(projectView(customView, snapshot)?.lists.map((entry) => entry.id)).toEqual([
      "second",
      "fallback",
      "first",
    ]);
  });

  it("excludes a custom view list after the matching tag is removed from the snapshot", () => {
    const customView = view({ viewTags: [{ viewId: "view-1", tagId: "a", tag: tag("a") }] });
    const snapshot = {
      view: view({ type: "ALL_LISTS" as const, viewTags: [] }),
      lists: [
        list("removed-tag", []),
        list("still-matching", ["a"]),
      ],
    };

    expect(projectView(customView, snapshot)?.lists.map((entry) => entry.id)).toEqual(["still-matching"]);
  });

  it("includes a custom view list after the required tag is added to the snapshot", () => {
    const customView = view({ viewTags: [{ viewId: "view-1", tagId: "a", tag: tag("a") }] });
    const snapshot = {
      view: view({ type: "ALL_LISTS" as const, viewTags: [] }),
      lists: [
        list("added-tag", ["a"]),
        list("missing-tag", []),
      ],
    };

    expect(projectView(customView, snapshot)?.lists.map((entry) => entry.id)).toEqual(["added-tag"]);
  });

  it.fails("projects UNTAGGED views to lists without tags", () => {
    const untaggedView = view({
      type: "UNTAGGED" as const,
      viewTags: [],
      viewLists: [],
    });
    const snapshot = {
      view: view({ type: "ALL_LISTS" as const, viewTags: [] }),
      lists: [
        list("tagged", ["a"]),
        list("untagged", []),
      ],
    };

    expect(projectView(untaggedView, snapshot)?.lists.map((entry) => entry.id)).toEqual(["untagged"]);
  });

  it("selects the default view before falling back to All Lists", () => {
    const allListsView = view({ id: "all", type: "ALL_LISTS" as const });
    const defaultView = view({ id: "default", isDefault: true });

    expect(selectedViewFromCache([allListsView, defaultView])?.id).toBe("default");
    expect(selectedViewFromCache([allListsView])?.id).toBe("all");
  });
});
