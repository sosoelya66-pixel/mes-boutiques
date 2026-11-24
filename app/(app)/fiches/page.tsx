import { Suspense } from "react";
import { ListingsPage } from "./ListingsPage";

export default function Page() {
  return (
    <Suspense>
      <ListingsPage />
    </Suspense>
  );
}
