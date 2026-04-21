"use client";

import { useSearchParams } from "next/navigation";
import BrandEventManagement from "@/components/sections/sub-section/dashboards/BrandEventManagement";
import BrandEventProposal from "@/components/sections/sub-section/dashboards/BrandEventProposal";

export default function BrandEventsMain() {
  const searchParams = useSearchParams();
  const action = searchParams?.get('action');

  // Show proposal form if action=propose, otherwise show management
  if (action === 'propose') {
    return <BrandEventProposal />;
  }

  return <BrandEventManagement />;
}
