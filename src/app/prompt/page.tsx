import { Suspense } from "react";
import { PromptDetail } from "@/features/library/PromptDetail";

// The id lives in the query string so this page can be statically exported for the Android bundle.
export default function PromptPage() {
  return (
    <Suspense>
      <PromptDetail />
    </Suspense>
  );
}
