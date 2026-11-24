import { Suspense } from "react";
import { SalesPreview } from "./SalesPreview";

export default function Page() {
  return (
    <Suspense>
      <SalesPreview />
    </Suspense>
  );
}
