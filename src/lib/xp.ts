// Relative imports: the seed script runs this file outside of Next.js.
import { eq, sum } from "drizzle-orm";
import type { Tx } from "../db";
import { columns, issues, members, xpAwards } from "../db/schema";
import { issueXp, levelProgress, type XpGain } from "./constants";

function memberXp(tx: Tx, memberId: number) {
  const row = tx
    .select({ total: sum(xpAwards.amount) })
    .from(xpAwards)
    .where(eq(xpAwards.memberId, memberId))
    .get();
  return Number(row?.total ?? 0);
}

/**
 * Makes the XP ledger match the issue: an award exists only while the issue
 * sits in a done column and has an assignee. Call it after anything that
 * changes an issue's column, assignee, type or priority. Returns the gain when
 * a person has just earned the issue's XP.
 */
export function syncIssueXp(tx: Tx, issueId: number): XpGain | null {
  const issue = tx
    .select({
      assigneeId: issues.assigneeId,
      type: issues.type,
      priority: issues.priority,
      isDone: columns.isDone,
    })
    .from(issues)
    .innerJoin(columns, eq(columns.id, issues.columnId))
    .where(eq(issues.id, issueId))
    .get();
  const award = tx
    .select()
    .from(xpAwards)
    .where(eq(xpAwards.issueId, issueId))
    .get();

  const earnerId = issue?.isDone ? issue.assigneeId : null;
  if (!issue || earnerId === null) {
    if (award) tx.delete(xpAwards).where(eq(xpAwards.id, award.id)).run();
    return null;
  }

  const amount = issueXp(issue.type, issue.priority);
  if (award?.memberId === earnerId) {
    if (award.amount !== amount) {
      tx.update(xpAwards).set({ amount }).where(eq(xpAwards.id, award.id)).run();
    }
    return null;
  }

  const member = tx.select().from(members).where(eq(members.id, earnerId)).get();
  if (!member) return null;

  if (award) tx.delete(xpAwards).where(eq(xpAwards.id, award.id)).run();
  const before = memberXp(tx, earnerId);
  tx.insert(xpAwards).values({ memberId: earnerId, issueId, amount }).run();

  const level = levelProgress(before + amount).level;
  return {
    memberName: member.name,
    amount,
    level,
    leveledUp: level > levelProgress(before).level,
  };
}
