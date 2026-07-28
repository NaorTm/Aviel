"use client";

import dynamic from "next/dynamic";

const BoqApp = dynamic(
  () => import("../src/features/boq-app").then((module) => module.BoqApp),
  {
    ssr: false,
    loading: () => (
      <main aria-busy="true" className="boot-screen">
        <div className="boot-mark" aria-hidden="true">
          א
        </div>
        <h1>אביאל BOQ</h1>
        <p>טוען את מערכת הצעות המחיר…</p>
      </main>
    ),
  },
);

export function BoqAppClient() {
  return <BoqApp />;
}
