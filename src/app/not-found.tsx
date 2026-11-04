"use client";

import Link from "next/link";
import { Card, EmptyState, buttonClasses } from "@/ui/primitives";

export default function NotFound() {
  return (
    <Card className="mx-auto max-w-xl">
      <EmptyState title="Page not found" detail="Check the address, or go back to Generate.">
        <Link href="/" className={`${buttonClasses("primary", "md")} no-underline`}>
          Back to Generate
        </Link>
      </EmptyState>
    </Card>
  );
}
