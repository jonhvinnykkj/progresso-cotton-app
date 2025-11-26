import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AppShell } from "./app-shell";
import {
  PageContent as PageContentNew,
  PageHeader as PageHeaderNew,
  Section as SectionNew,
} from "./page-components";

// Re-export para compatibilidade
export { PageContent, PageHeader, Section } from "./page-components";

type PageProps = {
  children: ReactNode;
  className?: string;
  tone?: "plain" | "soft";
  showFooter?: boolean;
};

/**
 * Page wrapper component que usa o novo AppShell
 * Mantido para compatibilidade com código existente
 */
export function Page({
  children,
  className,
  tone = "plain",
  showFooter = true,
}: PageProps) {
  return (
    <AppShell>
      <div className={cn(
        tone === "soft" && "hero-gradient",
        className
      )}>
        {children}
      </div>
    </AppShell>
  );
}

// Manter export do useSidebar para compatibilidade
export { useLayout as useSidebar } from "./app-shell";
