import { Text, View } from "@react-pdf/renderer";
import { resultBars } from "@/lib/insights/summary";
import type { PollExport } from "../data";
import {
  CommentsSection,
  ListSection,
  ReportDocument,
  ResultsSection,
  Rule,
  StatRow,
  Verdict,
  formatDateTime,
  formatDayKey,
  summaryStats,
} from "./components";
import { styles } from "./theme";

function ResponsesSection({ data }: { data: PollExport }) {
  const { poll, responses } = data;
  const cell = { paddingVertical: 4, paddingRight: 8 } as const;
  const whenWidth = poll.isAnonymous ? 70 : 110;
  return (
    <ListSection
      title="Responses"
      note={poll.isAnonymous ? "Anonymous poll: no names, and dates only." : "Times in UTC. Latest answers shown."}
      empty="No responses yet."
      head={
        <>
          <View style={{ flexDirection: "row" }}>
            {!poll.isAnonymous && <Text style={[cell, styles.small, styles.bold, { width: 110 }]}>Name</Text>}
            <Text style={[cell, styles.small, styles.bold, { width: whenWidth }]}>Submitted</Text>
            <Text style={[cell, styles.small, styles.bold, { flex: 1 }]}>Answers</Text>
          </View>
          <Rule strong />
        </>
      }
      items={responses.map((response) => (
        <View key={response.id} wrap={false}>
          <View style={{ flexDirection: "row" }}>
            {!poll.isAnonymous && <Text style={[cell, { width: 110 }]}>{response.name ?? "Anonymous"}</Text>}
            <Text style={[cell, styles.muted, { width: whenWidth, fontSize: 8.5 }]}>
              {poll.isAnonymous ? formatDayKey(response.updatedAt.toISOString().slice(0, 10)) : formatDateTime(response.updatedAt)}
            </Text>
            <Text style={[cell, { flex: 1 }]}>{response.summary}</Text>
          </View>
          <Rule />
        </View>
      ))}
    />
  );
}

/** What the group decided, the full result, what people said and every response. */
export function ResultsReport({ data }: { data: PollExport }) {
  return (
    <ReportDocument data={data} kind="Results report">
      <Verdict insights={data.insights} />
      <StatRow stats={summaryStats(data)} />
      <ResultsSection result={resultBars(data.insights)} />
      <CommentsSection title="Comments" insights={data.insights} />
      <ResponsesSection data={data} />
    </ReportDocument>
  );
}
