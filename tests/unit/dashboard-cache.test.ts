import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";

import {
  applyDeletedTagToDashboardCaches,
  applyTagChangeToCaches,
  buildPersistedItemOrderPayload,
  buildPersistedListOrderPayload,
  buildPersistedViewOrderPayload,
  canApplySelectedViewPayload,
  canRollbackViewSelection,
  hasSavedListInDashboardSnapshots,
  type DashboardSnapshot,
  listMatchesView,
  projectView,
  reconcileCreatedListInSnapshot,
  selectedViewFromCache,
  type ViewsCache,
} from "@/lib/dashboard-cache";

const tag = (id: string, name = id) => ({
  id,
  name,
  color: "gray" as const,
  userId: "user-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  listTags: [],
});

const item = (id: string, listId: string, order = 0) => ({
  id,
  name: id,
  listId,
  order,
  completed: false,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  notes: "",
});

const list = (id: string, tagIds: string[] = [], order = 0, overrides = {}) => ({
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
  ...overrides,
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
  it("ANY custom matching includes lists with at least one required tag", () => {
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

  it("UNTAGGED views match only lists without tags", () => {
    const untaggedView = view({ type: "UNTAGGED" as const, viewTags: [] });

    expect(listMatchesView(list("tagged", ["a"]), untaggedView)).toBe(false);
    expect(listMatchesView(list("untagged"), untaggedView)).toBe(true);
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

  it("projects ANY custom views with at least one matching tag", () => {
    const customView = view({ matchMode: "ANY" as const });
    const snapshot = {
      view: view({ type: "ALL_LISTS" as const, viewTags: [] }),
      lists: [
        list("has-a", ["a"], 2),
        list("missing-all", [], 1),
        list("has-b", ["b"], 0),
      ],
    };

    expect(projectView(customView, snapshot)?.lists.map((entry) => entry.id)).toEqual([
      "has-b",
      "has-a",
    ]);
  });

  it("uses list id as a deterministic tie-breaker when projected orders match", () => {
    const customView = view({
      viewTags: [{ viewId: "view-1", tagId: "a", tag: tag("a") }],
    });
    const snapshot = {
      view: view({ type: "ALL_LISTS" as const, viewTags: [] }),
      lists: [
        list("b", ["a"], 1),
        list("a", ["a"], 1),
      ],
    };

    expect(projectView(customView, snapshot)?.lists.map((entry) => entry.id)).toEqual(["a", "b"]);
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

  it("projects UNTAGGED views to lists without tags", () => {
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

  it("reprojects dashboard caches after tag add and remove", () => {
    const queryClient = new QueryClient();
    const allListsView = view({ id: "all", type: "ALL_LISTS" as const, viewTags: [] });
    const customView = view({
      id: "custom",
      viewTags: [{ viewId: "custom", tagId: "a", tag: tag("a") }],
    });
    const keys = {
      views: ["views"],
      allLists: ["all-lists"],
      currentView: ["current-view"],
      selectedView: ["selected-view"],
    };

    queryClient.setQueryData(keys.allLists, {
      view: allListsView,
      lists: [list("candidate", [], 0), list("member", ["a"], 1)],
    });
    queryClient.setQueryData(keys.currentView, {
      view: customView,
      lists: [list("member", ["a"], 1)],
    });
    queryClient.setQueryData(keys.selectedView, {
      view: customView,
      lists: [list("member", ["a"], 1)],
    });

    applyTagChangeToCaches(queryClient, keys, "candidate", tag("a"), "add");

    expect(
      queryClient
        .getQueryData<DashboardSnapshot>(keys.currentView)
        ?.lists.map((entry) => entry.id)
    ).toEqual(["candidate", "member"]);

    applyTagChangeToCaches(queryClient, keys, "member", tag("a"), "remove");

    expect(
      queryClient
        .getQueryData<DashboardSnapshot>(keys.selectedView)
        ?.lists.map((entry) => entry.id)
    ).toEqual(["candidate"]);
  });

  it("reprojects UNTAGGED caches after tag add and remove", () => {
    const queryClient = new QueryClient();
    const allListsView = view({ id: "all", type: "ALL_LISTS" as const, viewTags: [] });
    const untaggedView = view({ id: "untagged-view", type: "UNTAGGED" as const, viewTags: [] });
    const keys = {
      views: ["views"],
      allLists: ["all-lists"],
      currentView: ["current-view"],
      selectedView: ["selected-view"],
    };

    queryClient.setQueryData(keys.allLists, {
      view: allListsView,
      lists: [list("becomes-untagged", ["a"], 0), list("already-untagged", [], 1)],
    });
    queryClient.setQueryData(keys.currentView, {
      view: untaggedView,
      lists: [list("already-untagged", [], 1)],
    });
    queryClient.setQueryData(keys.selectedView, {
      view: untaggedView,
      lists: [list("already-untagged", [], 1)],
    });

    applyTagChangeToCaches(queryClient, keys, "becomes-untagged", tag("a"), "remove");

    expect(
      queryClient
        .getQueryData<DashboardSnapshot>(keys.currentView)
        ?.lists.map((entry) => entry.id)
    ).toEqual(["becomes-untagged", "already-untagged"]);

    applyTagChangeToCaches(queryClient, keys, "already-untagged", tag("a"), "add");

    expect(
      queryClient
        .getQueryData<DashboardSnapshot>(keys.selectedView)
        ?.lists.map((entry) => entry.id)
    ).toEqual(["becomes-untagged"]);
  });

  it("applies deleted tags through All Lists and reprojects custom views", () => {
    const queryClient = new QueryClient();
    const allListsView = view({ id: "all", type: "ALL_LISTS" as const, viewTags: [] });
    const customView = view({
      id: "custom",
      viewTags: [
        { viewId: "custom", tagId: "a", tag: tag("a") },
        { viewId: "custom", tagId: "b", tag: tag("b") },
      ],
    });
    const keys = {
      views: ["views"],
      allLists: ["all-lists"],
      currentView: ["current-view"],
      selectedView: ["selected-view"],
    };

    queryClient.setQueryData(keys.views, [allListsView, customView]);
    queryClient.setQueryData(keys.allLists, {
      view: allListsView,
      lists: [
        list("both", ["a", "b"], 0),
        list("only-b", ["b"], 1),
        list("untagged", [], 2),
      ],
    });
    queryClient.setQueryData(keys.currentView, {
      view: customView,
      lists: [list("both", ["a", "b"], 0)],
    });
    queryClient.setQueryData(keys.selectedView, {
      view: customView,
      lists: [list("both", ["a", "b"], 0)],
    });

    applyDeletedTagToDashboardCaches(queryClient, keys, "a");

    expect(
      queryClient
        .getQueryData<DashboardSnapshot>(keys.currentView)
        ?.lists.map((entry) => entry.id)
    ).toEqual(["both", "only-b"]);
    expect(
      queryClient
        .getQueryData<DashboardSnapshot>(keys.allLists)
        ?.lists.find((entry) => entry.id === "both")
        ?.listTags.map((listTag) => listTag.tagId)
    ).toEqual(["b"]);
    expect(
      queryClient
        .getQueryData<ViewsCache>(keys.views)
        ?.find((entry) => entry.id === "custom")
        ?.viewTags.map((viewTag) => viewTag.tagId)
    ).toEqual(["b"]);
  });

  it("selects the default view before falling back to All Lists", () => {
    const allListsView = view({ id: "all", type: "ALL_LISTS" as const });
    const defaultView = view({ id: "default", isDefault: true });

    expect(selectedViewFromCache([allListsView, defaultView])?.id).toBe("default");
    expect(selectedViewFromCache([allListsView])?.id).toBe("all");
  });

  it("rejects older selected view payloads when the latest selection differs", () => {
    const olderPayload = {
      view: view({ id: "older-view" }),
      lists: [list("older-list")],
    };

    expect(canApplySelectedViewPayload("latest-view", olderPayload)).toBe(false);
  });

  it("accepts selected view payloads when the payload matches the latest selection", () => {
    const latestPayload = {
      view: view({ id: "latest-view" }),
      lists: [list("latest-list")],
    };

    expect(canApplySelectedViewPayload("latest-view", latestPayload)).toBe(true);
  });

  it("ignores rollback for older failed selections after the latest selection changes", () => {
    expect(canRollbackViewSelection("latest-view", "older-view")).toBe(false);
  });

  it("allows rollback for the latest failed selection", () => {
    expect(canRollbackViewSelection("latest-view", "latest-view")).toBe(true);
  });

  it("replaces an optimistic list with the saved list while preserving local items", () => {
    const allListsView = view({ id: "all", type: "ALL_LISTS" as const, viewTags: [] });
    const optimisticItem = item("optimistic-item", "list-1");
    const snapshot = {
      view: allListsView,
      lists: [
        list("list-1", [], -1, {
          isOptimistic: true,
          listItems: [optimisticItem],
        }),
      ],
    };
    const savedList = list("list-1", [], 0, { name: "Saved list" });

    expect(
      reconcileCreatedListInSnapshot(snapshot, savedList, "list-1")?.lists[0]
    ).toMatchObject({
      id: "list-1",
      name: "Saved list",
      order: -1,
      listItems: [optimisticItem],
    });
  });

  it("removes duplicate optimistic rows when reconciling a saved list", () => {
    const allListsView = view({ id: "all", type: "ALL_LISTS" as const, viewTags: [] });
    const snapshot = {
      view: allListsView,
      lists: [
        list("list-1", [], -2, { isOptimistic: true }),
        list("existing-list", [], 0),
        list("list-1", [], -1, {
          isOptimistic: true,
          listItems: [
            item("optimistic-item-a", "list-1", 0),
            item("optimistic-item-b", "list-1", 1),
          ],
        }),
      ],
    };
    const savedList = list("list-1", [], 10, { name: "Saved list" });
    const reconciled = reconcileCreatedListInSnapshot(snapshot, savedList, "list-1");

    expect(reconciled?.lists.filter((entry) => entry.id === "list-1")).toHaveLength(1);
    expect(reconciled?.lists.find((entry) => entry.id === "list-1")).toMatchObject({
      name: "Saved list",
      order: -2,
      listItems: [
        item("optimistic-item-a", "list-1", 0),
        item("optimistic-item-b", "list-1", 1),
      ],
    });
  });

  it("preserves optimistic tags when reconciling a saved list", () => {
    const allListsView = view({ id: "all", type: "ALL_LISTS" as const, viewTags: [] });
    const snapshot = {
      view: allListsView,
      lists: [
        list("list-1", ["a"], -1, { isOptimistic: true }),
      ],
    };
    const savedList = list("list-1", [], 0, { name: "Saved list" });
    const reconciled = reconcileCreatedListInSnapshot(snapshot, savedList, "list-1");

    expect(
      reconciled?.lists[0].listTags.map((listTag) => listTag.tagId)
    ).toEqual(["a"]);
  });

  it("leaves snapshots unchanged when no matching optimistic list exists", () => {
    const allListsView = view({ id: "all", type: "ALL_LISTS" as const, viewTags: [] });
    const snapshot = {
      view: allListsView,
      lists: [list("existing-list")],
    };
    const savedList = list("list-1", [], 0, { name: "Saved list" });

    expect(reconcileCreatedListInSnapshot(snapshot, savedList, "list-1")).toBe(snapshot);
  });

  it("finds a saved parent list across dashboard snapshots", () => {
    const allListsView = view({ id: "all", type: "ALL_LISTS" as const, viewTags: [] });
    const allListsSnapshot = {
      view: allListsView,
      lists: [
        list("list-1", [], -1, { isOptimistic: true }),
      ],
    };
    const currentViewSnapshot = {
      view: allListsView,
      lists: [
        list("list-1", [], -1),
      ],
    };

    expect(
      hasSavedListInDashboardSnapshots(
        [allListsSnapshot, currentViewSnapshot],
        "list-1"
      )
    ).toBe(true);
  });

  it("does not treat optimistic-only parent lists as saved", () => {
    const allListsView = view({ id: "all", type: "ALL_LISTS" as const, viewTags: [] });
    const allListsSnapshot = {
      view: allListsView,
      lists: [
        list("list-1", [], -1, { isOptimistic: true }),
      ],
    };
    const selectedViewSnapshot = {
      view: allListsView,
      lists: [
        list("list-1", [], -1, { isOptimistic: true }),
      ],
    };

    expect(
      hasSavedListInDashboardSnapshots(
        [allListsSnapshot, undefined, selectedViewSnapshot],
        "list-1"
      )
    ).toBe(false);
  });

  it("builds list reorder payloads from saved rows only with compact order", () => {
    expect(
      buildPersistedListOrderPayload([
        list("optimistic-list", [], -1, { isOptimistic: true }),
        list("saved-second", [], 1),
        list("saved-first", [], 0),
      ])
    ).toEqual([
      { id: "saved-second", order: 0 },
      { id: "saved-first", order: 1 },
    ]);
  });

  it("builds item reorder payloads without optimistic lists or items", () => {
    expect(
      buildPersistedItemOrderPayload([
        list("source", [], 0, {
          listItems: [
            item("source-saved", "source", 0),
            { ...item("source-optimistic", "source", 1), isOptimistic: true },
          ],
        }),
        list("optimistic-target", [], -1, {
          isOptimistic: true,
          listItems: [item("hidden-saved", "optimistic-target", 0)],
        }),
        list("target", [], 1, {
          listItems: [
            item("moved-saved", "source", 0),
            item("target-saved", "target", 1),
          ],
        }),
      ])
    ).toEqual([
      { id: "source-saved", listId: "source", order: 0 },
      { id: "moved-saved", listId: "target", order: 0 },
      { id: "target-saved", listId: "target", order: 1 },
    ]);
  });

  it("builds view reorder payloads from saved rows only with compact order", () => {
    expect(
      buildPersistedViewOrderPayload([
        view({ id: "optimistic-view", userId: "optimistic", order: -1 }),
        view({ id: "saved-second", order: 2 }),
        view({ id: "saved-first", order: 1 }),
      ])
    ).toEqual([
      { id: "saved-second", order: 0 },
      { id: "saved-first", order: 1 },
    ]);
  });
});
