import type { Metadata } from "next";
import { TeamEditor } from "@/components/TeamEditor";
import {
  ISSUE_PRIORITIES,
  ISSUE_TYPES,
  PRIORITY_LABELS,
  TYPE_LABELS,
  issueXp,
} from "@/lib/constants";
import { listMembers } from "@/lib/queries";

export const metadata: Metadata = { title: "Zespół" };

export default function TeamPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 md:py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Zespół</h1>
        <p className="mt-1 text-sm text-muted">
          Osoba przypisana do zadania zdobywa XP, gdy zadanie trafi do kolumny
          ukończonych. Zebrane XP przekłada się na kolejne poziomy.
        </p>

        <TeamEditor members={listMembers()} />

        <section className="mt-8 rounded-xl border border-line bg-surface p-5">
          <h2 className="font-semibold">Ile XP za zadanie</h2>
          <p className="mt-1 text-sm text-muted">
            Nagroda zależy od typu i priorytetu zadania. Cofnięcie zadania z
            kolumny ukończonych odbiera XP.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th scope="col" className="py-1.5 pr-4 font-medium">
                    Typ
                  </th>
                  {ISSUE_PRIORITIES.map((priority) => (
                    <th
                      key={priority}
                      scope="col"
                      className="px-2 py-1.5 text-right font-medium"
                    >
                      {PRIORITY_LABELS[priority]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ISSUE_TYPES.map((type) => (
                  <tr key={type} className="border-t border-line">
                    <th scope="row" className="py-2 pr-4 text-left font-medium">
                      {TYPE_LABELS[type]}
                    </th>
                    {ISSUE_PRIORITIES.map((priority) => (
                      <td key={priority} className="px-2 py-2 text-right">
                        {issueXp(type, priority)} XP
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
