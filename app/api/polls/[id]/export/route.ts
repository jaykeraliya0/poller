import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/guards";
import { toCsv } from "@/lib/csv";
import { utcDayKey } from "@/lib/datetime";
import { db } from "@/lib/db";
import { getPollType } from "@/poll-types/registry";

const notFound = () => new Response("Not found", { status: 404 });

/** Owner-only CSV of every response. Anyone else gets a 404, like the manage page. */
export async function GET(_request: Request, context: RouteContext<"/api/polls/[id]/export">) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user || !z.uuid().safeParse(id).success) return notFound();

  const poll = await db.poll.findFirst({
    where: { id, creatorId: user.id },
    include: {
      options: { orderBy: { position: "asc" } },
      responses: {
        orderBy: { createdAt: "asc" },
        include: { answers: { select: { optionId: true, value: true } } },
      },
    },
  });
  if (!poll) return notFound();

  const definition = getPollType(poll.type);
  const header = [
    "Submitted",
    ...(poll.isAnonymous ? [] : ["Name"]),
    ...poll.options.map((option) => option.label),
    "Comment",
  ];
  const rows = poll.responses.map((response) => {
    const values = new Map(response.answers.map((answer) => [answer.optionId, answer.value]));
    return [
      // Anonymous polls export only the day, like the comments feed.
      poll.isAnonymous ? utcDayKey(response.updatedAt) : response.updatedAt.toISOString(),
      ...(poll.isAnonymous ? [] : [response.voterName ?? ""]),
      ...poll.options.map((option) => definition.csvValue(values.get(option.id))),
      response.comment ?? "",
    ];
  });

  // BOM so Excel reads UTF-8 (accents, emoji) correctly.
  return new Response(`﻿${toCsv([header, ...rows])}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="poll-${poll.slug}-responses.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
