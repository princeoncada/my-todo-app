import { RouterOutputs } from "@/lib/trpc";

export type CurrentView = RouterOutputs['view']['getCurrentViewListsWithItems']
export type AllListsView = RouterOutputs['view']['getAllListsWithItems']
export type Lists = AllListsView['lists']
export type List = Lists[number]
export type ListItems = List['listItems']
export type ListItem = ListItems[number]
export type OptimisticList = List & {
  isOptimistic?: boolean;
};
export type OptimisticListItem = ListItem & {
  isOptimistic?: boolean;
};
