// Minimal ambient types for react-horizontal-scrolling-menu v4.x.
//
// The package ships full types at dist/types/index.d.ts, but its package.json
// "exports" field omits a "types" condition, so tsc with
// moduleResolution: "Bundler" cannot reach them. This shim covers only the
// surface area used in this codebase (ScrollMenu + VisibilityContext).
// Upgrading the library to >= v8 — which adds "types" to "exports" — would
// let us delete this file and use the upstream types directly.

declare module "react-horizontal-scrolling-menu" {
  import * as React from "react";

  export interface VisibilityContextValue {
    isFirstItemVisible: boolean;
    isLastItemVisible: boolean;
    scrollPrev: () => void;
    scrollNext: () => void;
    visibleElements: unknown[];
    initComplete: boolean;
  }

  export const VisibilityContext: React.Context<VisibilityContextValue>;

  export interface ScrollMenuProps {
    LeftArrow?: React.ComponentType | React.ReactNode;
    RightArrow?: React.ComponentType | React.ReactNode;
    children?: React.ReactNode;
  }

  export const ScrollMenu: React.FC<ScrollMenuProps>;
}
