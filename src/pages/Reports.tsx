import { useCallback, useEffect, useMemo, useState } from "react";
import {
  reportService,
  type MinistryReport,
  type FollowupStatusBreakdownItem,
  type LeaderPerformanceRow,
} from "@/integrations/supabase/services/reportService";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { stageBadgeClass } from "@/utils/format";
import { STAGE_LABEL, STAGE_ORDER, type RelationshipStage } from "@/types";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  Download,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

const STAGE_COLORS: Record<RelationshipStage, string> = {
  new_believer: "hsl(var(--stage-new))",
  foundations: "hsl(var(--stage-foundations))",
  growing: "hsl(var(--stage-growing))",
  serving: "hsl(var(--stage-serving))",
  mentoring: "hsl(var(--stage-mentoring))",
  multiplying: "hsl(var(--stage-multiplying))",
};

const FOLLOWUP_STATUS_META: Record<FollowupStatusBreakdownItem["status"], { label: string; color: string }> = {
  pending: { label: "Pending", color: "hsl(var(--warning))" },
  completed: { label: "Completed", color: "hsl(var(--success))" },
  missed: { label: "Missed", color: "hsl(var(--destructive))" },
  cancelled: { label: "Cancelled", color: "hsl(var(--muted-foreground))" },
};

const ACTIVITY_CHART_CONFIG = {
  meetings: { label: "Meetings", color: "hsl(var(--primary))" },
  followups_created: { label: "Follow-ups Created", color: "hsl(var(--accent))" },
  followups_completed: { label: "Follow-ups Completed", color: "hsl(var(--success))" },
} satisfies ChartConfig;

const STAGE_CHART_CONFIG = {
  count: { label: "Active Relationships", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const STATUS_CHART_CONFIG = {
  pending: { label: "Pending", color: FOLLOWUP_STATUS_META.pending.color },
  completed: { label: "Completed", color: FOLLOWUP_STATUS_META.completed.color },
  missed: { label: "Missed", color: FOLLOWUP_STATUS_META.missed.color },
  cancelled: { label: "Cancelled", color: FOLLOWUP_STATUS_META.cancelled.color },
} satisfies ChartConfig;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function csvCell(value: string | number) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function downloadBlob(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportReportCsv(report: MinistryReport) {
  const rows: string[] = [];
  rows.push("Soma Ministry Report");
  rows.push(`Generated At,${csvCell(new Date(report.generated_at).toLocaleString())}`);
  rows.push("");

  rows.push("KPI,Value");
  rows.push(`Total Users,${report.total_users}`);
  rows.push(`Active Relationships,${report.active_relationships}`);
  rows.push(`Meetings (30d),${report.meetings_last_30d}`);
  rows.push(`Follow-ups Pending,${report.followups_pending}`);
  rows.push(`Follow-ups Completed,${report.followups_completed}`);
  rows.push(`At-risk Follow-ups,${report.at_risk}`);
  rows.push(`Completion Rate (%),${report.followup_completion_rate}`);
  rows.push(`Avg Disciples per Leader,${report.active_disciples_per_leader}`);
  rows.push("");

  rows.push("Stage,Active Relationships");
  for (const stage of STAGE_ORDER) {
    rows.push(`${csvCell(STAGE_LABEL[stage])},${report.by_stage[stage] ?? 0}`);
  }
  rows.push("");

  rows.push("Month,Meetings,Follow-ups Created,Follow-ups Completed");
  for (const point of report.monthly_activity) {
    rows.push(
      [
        csvCell(point.month_label),
        point.meetings,
        point.followups_created,
        point.followups_completed,
      ].join(","),
    );
  }
  rows.push("");

  rows.push("Follow-up Status,Count");
  for (const item of report.followup_status_breakdown) {
    rows.push(`${csvCell(FOLLOWUP_STATUS_META[item.status].label)},${item.count}`);
  }
  rows.push("");

  rows.push("Leader,Active Disciples,Meetings (30d),Pending Follow-ups,At-risk Follow-ups");
  for (const leader of report.leader_performance) {
    rows.push(
      [
        csvCell(leader.leader_name),
        leader.active_disciples,
        leader.meetings_last_30d,
        leader.followups_pending,
        leader.at_risk_followups,
      ].join(","),
    );
  }

  const filename = `soma-ministry-report-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadBlob(filename, rows.join("\n"), "text/csv;charset=utf-8;");
}

function exportReportPdf(report: MinistryReport, stageRows: Array<{ label: string; count: number }>) {
  const chartBlocks = Array.from(document.querySelectorAll<HTMLElement>("[data-export-chart-block]"));
  const chartMarkup = chartBlocks
    .map((block) => {
      const title = block.getAttribute("data-chart-title") ?? "Chart";
      const svg = block.querySelector("svg")?.outerHTML;
      if (!svg) return "";
      return `
        <section class="panel">
          <h3>${escapeHtml(title)}</h3>
          <div class="chart">${svg}</div>
        </section>
      `;
    })
    .join("");

  const stageMarkup = stageRows
    .map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${row.count}</td></tr>`)
    .join("");

  const leaderMarkup = report.leader_performance
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.leader_name)}</td>
        <td>${row.active_disciples}</td>
        <td>${row.meetings_last_30d}</td>
        <td>${row.followups_pending}</td>
        <td>${row.at_risk_followups}</td>
      </tr>
    `,
    )
    .join("");

  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900");
  if (!printWindow) {
    toast.error("Enable pop-ups to export PDF.");
    return;
  }

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Soma Ministry Report</title>
        <style>
          body {
            margin: 24px;
            color: #0f172a;
            font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
            font-size: 12px;
            line-height: 1.45;
          }
          h1 {
            margin: 0 0 8px;
            font-size: 28px;
            font-weight: 700;
          }
          h2 {
            margin: 0 0 10px;
            font-size: 16px;
            font-weight: 700;
          }
          h3 {
            margin: 0 0 8px;
            font-size: 13px;
            font-weight: 600;
          }
          .meta {
            color: #475569;
            margin-bottom: 18px;
          }
          .kpis {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 18px;
          }
          .kpi {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 10px;
          }
          .kpi-label {
            color: #475569;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
          }
          .kpi-value {
            margin-top: 6px;
            font-size: 20px;
            font-weight: 700;
          }
          .panel {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
          }
          .chart svg {
            width: 100%;
            height: auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            text-align: left;
          }
          th {
            background: #f8fafc;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <h1>Soma Ministry Report</h1>
        <div class="meta">Generated ${escapeHtml(new Date(report.generated_at).toLocaleString())}</div>

        <section class="kpis">
          <div class="kpi"><div class="kpi-label">Total Users</div><div class="kpi-value">${report.total_users}</div></div>
          <div class="kpi"><div class="kpi-label">Active Relationships</div><div class="kpi-value">${report.active_relationships}</div></div>
          <div class="kpi"><div class="kpi-label">Meetings (30d)</div><div class="kpi-value">${report.meetings_last_30d}</div></div>
          <div class="kpi"><div class="kpi-label">Pending Follow-ups</div><div class="kpi-value">${report.followups_pending}</div></div>
          <div class="kpi"><div class="kpi-label">At-risk Follow-ups</div><div class="kpi-value">${report.at_risk}</div></div>
          <div class="kpi"><div class="kpi-label">Completion Rate</div><div class="kpi-value">${report.followup_completion_rate}%</div></div>
        </section>

        ${chartMarkup}

        <section class="panel">
          <h2>Stage Distribution</h2>
          <table>
            <thead><tr><th>Stage</th><th>Active Relationships</th></tr></thead>
            <tbody>${stageMarkup}</tbody>
          </table>
        </section>

        <section class="panel">
          <h2>Leader Performance</h2>
          <table>
            <thead>
              <tr>
                <th>Leader</th>
                <th>Active Disciples</th>
                <th>Meetings (30d)</th>
                <th>Pending Follow-ups</th>
                <th>At-risk Follow-ups</th>
              </tr>
            </thead>
            <tbody>${leaderMarkup}</tbody>
          </table>
        </section>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 300);
}

function riskBadgeClass(value: number) {
  if (value > 3) return "bg-destructive/15 text-destructive border-destructive/30";
  if (value > 0) return "bg-warning/15 text-warning-foreground border-warning/30";
  return "bg-success/15 text-success border-success/30";
}

function normalizeReport(raw: Partial<MinistryReport>): MinistryReport {
  return {
    generated_at: raw.generated_at ?? new Date().toISOString(),
    total_users: raw.total_users ?? 0,
    active_relationships: raw.active_relationships ?? 0,
    meetings_last_30d: raw.meetings_last_30d ?? 0,
    followups_pending: raw.followups_pending ?? 0,
    followups_completed: raw.followups_completed ?? 0,
    at_risk: raw.at_risk ?? 0,
    followup_completion_rate: raw.followup_completion_rate ?? 0,
    active_disciples_per_leader: raw.active_disciples_per_leader ?? 0,
    by_stage: raw.by_stage ?? {},
    followup_status_breakdown: raw.followup_status_breakdown ?? [],
    monthly_activity: raw.monthly_activity ?? [],
    leader_performance: raw.leader_performance ?? [],
  };
}

export default function Reports() {
  const [report, setReport] = useState<MinistryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportService.getMinistryReport();
      setReport(normalizeReport(data as Partial<MinistryReport>));
    } catch (e: any) {
      const message = e?.message ?? "Unable to load reports.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Reports - Soma";
    load();
  }, [load]);

  const stageData = useMemo(() => {
    if (!report) return [];
    return STAGE_ORDER.map((stage) => ({
      stage,
      label: STAGE_LABEL[stage],
      count: report.by_stage[stage] ?? 0,
      fill: STAGE_COLORS[stage],
    }));
  }, [report]);

  const statusData = useMemo(() => {
    if (!report) return [];
    return report.followup_status_breakdown.map((item) => ({
      ...item,
      label: FOLLOWUP_STATUS_META[item.status].label,
      fill: FOLLOWUP_STATUS_META[item.status].color,
    }));
  }, [report]);

  const leaders = useMemo(() => (report?.leader_performance ?? []).slice(0, 12), [report]);

  const stageMax = useMemo(() => Math.max(...stageData.map((row) => row.count), 1), [stageData]);

  const onExportCsv = () => {
    if (!report) return;
    try {
      setExporting("csv");
      exportReportCsv(report);
      toast.success("CSV export ready.");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to export CSV.");
    } finally {
      setExporting(null);
    }
  };

  const onExportPdf = () => {
    if (!report) return;
    try {
      setExporting("pdf");
      exportReportPdf(
        report,
        stageData.map((row) => ({ label: row.label, count: row.count })),
      );
    } finally {
      setTimeout(() => setExporting(null), 500);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Reports unavailable"
        description={error ?? "You may not have access to ministry reports."}
      />
    );
  }

  const kpis = [
    { label: "Total Users", value: report.total_users },
    { label: "Active Relationships", value: report.active_relationships },
    { label: "Meetings (30d)", value: report.meetings_last_30d },
    { label: "Pending Follow-ups", value: report.followups_pending },
    { label: "At-risk Follow-ups", value: report.at_risk, accent: report.at_risk > 0 },
    { label: "Completion Rate", value: `${report.followup_completion_rate}%` },
    { label: "Avg Disciples per Leader", value: report.active_disciples_per_leader },
  ];

  return (
    <>
      <PageHeader
        title="Admin Reports"
        description="Operational visibility for disciple care, accountability execution, and leader load."
        actions={
          <>
            <Button variant="outline" onClick={load}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={onExportCsv} disabled={exporting !== null}>
              {exporting === "csv" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Export CSV
            </Button>
            <Button onClick={onExportPdf} disabled={exporting !== null}>
              {exporting === "pdf" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Export PDF
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        {kpis.map((item) => (
          <Card key={item.label} className="p-5 shadow-soft">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{item.label}</p>
            <p className={`font-display text-3xl font-semibold mt-2 ${item.accent ? "text-destructive" : "text-primary"}`}>
              {item.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3 mb-6">
        <Card className="p-6 xl:col-span-2" data-export-chart-block data-chart-title="Monthly Activity">
          <div className="mb-4">
            <h2 className="font-display text-xl font-semibold">6-Month Activity Trend</h2>
            <p className="text-sm text-muted-foreground">Compare meeting cadence with follow-up creation and closure.</p>
          </div>
          <ChartContainer config={ACTIVITY_CHART_CONFIG} className="h-[300px] w-full" data-export-chart>
            <LineChart data={report.monthly_activity}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month_label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line type="monotone" dataKey="meetings" stroke="var(--color-meetings)" strokeWidth={2.5} dot />
              <Line
                type="monotone"
                dataKey="followups_created"
                stroke="var(--color-followups_created)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="followups_completed"
                stroke="var(--color-followups_completed)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </Card>

        <Card className="p-6" data-export-chart-block data-chart-title="Follow-up Status">
          <div className="mb-4">
            <h2 className="font-display text-xl font-semibold">Follow-up Status Mix</h2>
            <p className="text-sm text-muted-foreground">Balance of open versus resolved accountability work.</p>
          </div>
          <ChartContainer config={STATUS_CHART_CONFIG} className="h-[300px] w-full" data-export-chart>
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Pie data={statusData} dataKey="count" nameKey="status" innerRadius={70} outerRadius={100} paddingAngle={2}>
                {statusData.map((entry) => (
                  <Cell key={entry.status} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3 mb-6">
        <Card className="p-6 xl:col-span-2" data-export-chart-block data-chart-title="Active Relationships by Stage">
          <div className="mb-4">
            <h2 className="font-display text-xl font-semibold">Active Relationships by Stage</h2>
            <p className="text-sm text-muted-foreground">Pipeline concentration across discipleship stages.</p>
          </div>
          <ChartContainer config={STAGE_CHART_CONFIG} className="h-[300px] w-full" data-export-chart>
            <BarChart data={stageData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {stageData.map((row) => (
                  <Cell key={row.stage} fill={row.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-accent" />
            Stage Pulse
          </h2>
          <div className="space-y-3">
            {stageData.map((row) => (
              <div key={row.stage}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <Badge variant="outline" className={stageBadgeClass[row.stage]}>
                    {row.label}
                  </Badge>
                  <span className="text-muted-foreground">{row.count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(row.count / stageMax) * 100}%`,
                      backgroundColor: row.fill,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4">
          <h2 className="font-display text-xl font-semibold">Leader Performance Snapshot</h2>
          <p className="text-sm text-muted-foreground">
            Rank leaders by risk exposure and workload for targeted coaching support.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Leader</TableHead>
              <TableHead>Active Disciples</TableHead>
              <TableHead>Meetings (30d)</TableHead>
              <TableHead>Pending Follow-ups</TableHead>
              <TableHead>At-risk Follow-ups</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No leader-level data available yet.
                </TableCell>
              </TableRow>
            ) : (
              leaders.map((leader: LeaderPerformanceRow) => (
                <TableRow key={leader.leader_id}>
                  <TableCell className="font-medium">{leader.leader_name}</TableCell>
                  <TableCell>{leader.active_disciples}</TableCell>
                  <TableCell>{leader.meetings_last_30d}</TableCell>
                  <TableCell>{leader.followups_pending}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={riskBadgeClass(leader.at_risk_followups)}>
                      {leader.at_risk_followups}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
