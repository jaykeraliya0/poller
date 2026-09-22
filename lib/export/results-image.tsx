import "server-only";
import { ImageResponse } from "next/og";
import { plural } from "@/lib/insights/outcome";
import { CONSENSUS_LABEL, headlineSentence, outcomeLabel, resultBars, verdictName } from "@/lib/insights/summary";
import type { PollExport } from "./data";
import { color } from "./pdf/theme";

const WIDTH = 1200;
/** Bars drawn; the rest fold into a "+N more" line so the image stays shareable. */
const MAX_BARS = 12;
const BAR_ROW_HEIGHT = 64;

/**
 * A single shareable picture of the result: the verdict and one bar per
 * option, sized to fit however many options there are. Built with Satori
 * (flexbox only), so every element is a flex container.
 */
export function renderResultsImage(data: PollExport, headers: Record<string, string>): ImageResponse {
  const { poll, typeLabel, insights } = data;
  const open = insights.common.status !== "CLOSED";
  const result = resultBars(insights);
  const bars = result.bars.slice(0, MAX_BARS);
  const hidden = result.bars.length - bars.length;
  const name = verdictName(insights);
  const { byType, common } = insights;
  const consensus = (byType.kind === "CHOICE" || byType.kind === "RANKING") && common.hasEnoughData ? byType.consensus : null;
  const height = 400 + (name ? 60 : 0) + bars.length * BAR_ROW_HEIGHT + (hidden ? 40 : 0) + (result.legend ? 40 : 0);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: color.canvas,
          padding: 48,
          color: color.ink,
          fontSize: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 22 }}>
          <div style={{ display: "flex", color: color.signal, fontWeight: 700, fontSize: 28 }}>Poller</div>
          <div style={{ display: "flex", color: color.muted }}>
            {typeLabel} · {plural(common.totalResponses, "response")} · {open ? "Results so far" : "Final results"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 28,
            padding: 40,
            backgroundColor: color.panel,
            borderRadius: 24,
            border: `1px solid ${color.line}`,
            flexGrow: 1,
          }}
        >
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, lineHeight: 1.15 }}>{poll.title}</div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 24, paddingLeft: 20, borderLeft: `6px solid ${color.signal}` }}>
            <div style={{ display: "flex", fontSize: 20, color: color.muted, textTransform: "uppercase", letterSpacing: 1 }}>
              {[outcomeLabel(byType.outcome, open), consensus && CONSENSUS_LABEL[consensus]].filter(Boolean).join("  ·  ")}
            </div>
            {name && <div style={{ display: "flex", fontSize: 44, fontWeight: 700, marginTop: 6 }}>{name}</div>}
            <div style={{ display: "flex", fontSize: 24, color: name ? color.muted : color.ink, marginTop: 6 }}>
              {headlineSentence(insights)}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 32 }}>
            {bars.map((bar) => (
              <div key={bar.optionId} style={{ display: "flex", alignItems: "center", height: BAR_ROW_HEIGHT }}>
                <div
                  style={{
                    display: "flex",
                    width: 330,
                    flexShrink: 0,
                    paddingRight: 20,
                    fontSize: 24,
                    color: bar.leading ? color.ink : color.muted,
                    fontWeight: bar.leading ? 700 : 400,
                  }}
                >
                  {bar.label}
                </div>
                {/* Only the track flexes; the label and value columns keep their widths so rows line up. */}
                <div
                  style={{
                    display: "flex",
                    flexGrow: 1,
                    flexShrink: 1,
                    flexBasis: 0,
                    minWidth: 0,
                    height: 22,
                    borderRadius: 6,
                    backgroundColor: color.track,
                    overflow: "hidden",
                  }}
                >
                  {bar.segments.map((value, i) =>
                    value > 0 ? (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          width: `${value * 100}%`,
                          height: "100%",
                          backgroundColor: result.legend
                            ? [color.signal, color.accentSoft][i]
                            : bar.leading
                              ? color.signal
                              : color.rest,
                          borderRight: i === 0 && bar.segments.length > 1 ? `3px solid ${color.panel}` : "none",
                        }}
                      />
                    ) : null,
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", width: 270, flexShrink: 0, paddingLeft: 20, fontSize: 22 }}>
                  {bar.value}
                </div>
              </div>
            ))}
            {hidden > 0 && (
              <div style={{ display: "flex", fontSize: 20, color: color.muted, marginTop: 8 }}>
                And {plural(hidden, "more option")}
              </div>
            )}
            {result.legend && (
              <div style={{ display: "flex", gap: 24, marginTop: 12, fontSize: 20, color: color.muted }}>
                {result.legend.map((label, i) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", width: 16, height: 16, borderRadius: 4, backgroundColor: [color.signal, color.accentSoft][i] }} />
                    {label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height, headers },
  );
}
