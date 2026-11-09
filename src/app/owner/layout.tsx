import type { ReactNode } from "react";

export const instant = false;

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return children;
}
