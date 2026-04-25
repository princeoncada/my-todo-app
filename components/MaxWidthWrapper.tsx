import { ReactNode } from "react";
import { cn } from "@/lib/utils";

const MaxWidthWrapper = ({ children, singleItemPage = false }: { children: ReactNode; singleItemPage?: boolean; }) => {
  return (
    <div className={cn("w-full max-w-7xl min-h-full xl:px-0 px-2", {
      "flex items-center justify-center": singleItemPage
    })}>
      {children}
    </div>

  );
};

export default MaxWidthWrapper;