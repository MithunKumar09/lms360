"use client";

import { useSearchParams } from "next/navigation";
import BrandCertificateDesigner from "@/components/sections/sub-section/dashboards/BrandCertificateDesigner";

export default function BrandCertificateCreateMain() {
  const searchParams = useSearchParams();
  const editId = searchParams?.get('edit');

  return <BrandCertificateDesigner certificateId={editId || null} />;
}
