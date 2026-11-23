import { loadPageData } from "@/lib/data";
import { DealBriefApp } from "./components/DealBriefApp";

// Static: sources and precomputed briefs are read at build time, so loading the
// page never calls the API.
export const dynamic = "force-static";

export default function Page() {
  return <DealBriefApp {...loadPageData()} />;
}
