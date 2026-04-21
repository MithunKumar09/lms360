'use client';

import Link from "next/link";
import { useState } from "react";
import SessionsManager from "@/app/dashboards/superadmin-classes-subjects/masters/sessions/page";
import TermsManager from "@/app/dashboards/superadmin-classes-subjects/masters/terms/page";
import SectionsManager from "@/app/dashboards/superadmin-classes-subjects/masters/sections/page";
import ProgramNodesManager from "@/app/dashboards/superadmin-classes-subjects/masters/program-nodes/page";

export default function MastersInline() {
  const [active, setActive] = useState(null);

  const cards = [
    {
      href: "/dashboards/superadmin-classes-subjects/masters/sessions",
      title: "Academic Sessions",
      description: "Create and manage academic sessions",
      key: "sessions",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-calendar text-primary dark:text-primary-dark">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      ),
    },
    {
      href: "/dashboards/superadmin-classes-subjects/masters/terms",
      title: "Terms (Year/Semester)",
      description: "Create and manage academic terms",
      key: "terms",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-layers text-primary dark:text-primary-dark">
          <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
          <polyline points="2 17 12 22 22 17"></polyline>
          <polyline points="2 12 12 17 22 12"></polyline>
        </svg>
      ),
    },
    {
      href: "/dashboards/superadmin-classes-subjects/masters/sections",
      title: "Sections",
      description: "Create and manage class sections",
      key: "sections",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-columns text-primary dark:text-primary-dark">
          <rect x="3" y="3" width="7" height="18"></rect>
          <rect x="14" y="3" width="7" height="18"></rect>
        </svg>
      ),
    },
    {
      href: "/dashboards/superadmin-classes-subjects/masters/program-nodes",
      title: "Program Nodes",
      description: "Streams, combinations, grades, programmes",
      key: "nodes",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-git-branch text-primary dark:text-primary-dark">
          <line x1="6" y1="3" x2="6" y2="15"></line>
          <circle cx="6" cy="18" r="3"></circle>
          <circle cx="18" cy="6" r="3"></circle>
          <path d="M6 9a9 9 0 0 0 9 9"></path>
        </svg>
      ),
    },
  ];

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-textColor dark:text-textColor-dark">Masters</h1>
        <p className="text-sm text-textColor/70 dark:text-textColor-dark/70 mt-1">
          Manage academic sessions, terms, sections, and program nodes for organizations.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <button
            key={c.href}
            type="button"
            onClick={() => setActive(c.key)}
            className={`text-left p-6 rounded-lg bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark hover:shadow-lg transition-shadow ${active === c.key ? 'ring-2 ring-primaryColor' : ''}`}
          >
            <div className="mb-4">{c.icon}</div>
            <h3 className="text-lg font-semibold text-textColor dark:text-textColor-dark mb-1">{c.title}</h3>
            <p className="text-sm text-textColor/70 dark:text-textColor-dark/70">{c.description}</p>
            <div className="mt-3">
              <Link href={c.href} className="text-xs text-primaryColor hover:underline">
                Open full page
              </Link>
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div className="mt-8">
          {active === 'sessions' && <SessionsManager />}
          {active === 'terms' && <TermsManager />}
          {active === 'sections' && <SectionsManager />}
          {active === 'nodes' && <ProgramNodesManager />}
        </div>
      )}
    </div>
  );
}


