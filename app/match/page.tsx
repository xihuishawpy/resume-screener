"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type {
  Job,
  MatchResult,
  Feedback,
  ParsedResume,
  CredibilityRisk,
  FilterDetail,
} from "@/lib/types";
import { Loader2Icon, UsersIcon, ScaleIcon } from "lucide-react";

// ─── Helper: parse analysis ───

interface AnalysisSections {
  advantages: string;
  disadvantages: string;
  suggestions: string;
}

function parseAnalysis(analysis: string): AnalysisSections {
  const result: AnalysisSections = {
    advantages: "",
    disadvantages: "",
    suggestions: "",
  };
  // Try JSON first
  try {
    const obj = JSON.parse(analysis);
    if (obj.advantages || obj.优势) result.advantages = obj.advantages || obj.优势 || "";
    if (obj.disadvantages || obj.不足) result.disadvantages = obj.disadvantages || obj.不足 || "";
    if (obj.suggestions || obj.建议) result.suggestions = obj.suggestions || obj.建议 || "";
    return result;
  } catch {
    // Fall through
  }
  // Parse text for Chinese keys
  const lines = analysis;
  const advMatch = lines.match(/优势[：:]\s*([\s\S]*?)(?=不足[：:]|建议[：:]|$)/);
  const disMatch = lines.match(/不足[：:]\s*([\s\S]*?)(?=优势[：:]|建议[：:]|$)/);
  const sugMatch = lines.match(/建议[：:]\s*([\s\S]*?)(?=优势[：:]|不足[：:]|$)/);
  if (advMatch) result.advantages = advMatch[1].trim();
  if (disMatch) result.disadvantages = disMatch[1].trim();
  if (sugMatch) result.suggestions = sugMatch[1].trim();
  // Fallback: if nothing parsed, put everything in advantages
  if (!result.advantages && !result.disadvantages && !result.suggestions) {
    result.advantages = analysis;
  }
  return result;
}

// ─── Status/vote labels ───

const statusOptions = [
  { value: "pending", label: "待筛选" },
  { value: "screening", label: "筛选中" },
  { value: "interviewing", label: "面试中" },
  { value: "hired", label: "已录用" },
  { value: "rejected", label: "已淘汰" },
];

function getStatusLabel(status: string) {
  return statusOptions.find((o) => o.value === status)?.label || status;
}

// ─── Score colors ───

function scoreColor(score: number) {
  if (score >= 75) return "text-green-600";
  if (score >= 50) return "text-yellow-600";
  return "text-red-500";
}

function scoreBg(score: number) {
  if (score >= 75) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

function scoreBorder(score: number) {
  if (score >= 75) return "border-green-500";
  if (score >= 50) return "border-yellow-500";
  return "border-red-500";
}

// ─── Recommendation ───

function getRecommendation(score: number, filterPassed: boolean) {
  if (!filterPassed) return { label: "不推荐", variant: "destructive" as const };
  if (score >= 80) return { label: "强烈推荐", variant: "default" as const };
  if (score >= 60) return { label: "推荐", variant: "secondary" as const };
  return { label: "待定", variant: "outline" as const };
}

// ─── Main Page ───

export default function MatchPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [results, setResults] = useState<MatchResult[]>([]);
  const [feedbackMap, setFeedbackMap] = useState<Record<number, Feedback>>({});
  const [loading, setLoading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Modal states
  const [credibilityOpen, setCredibilityOpen] = useState(false);
  const [credibilityData, setCredibilityData] = useState<{
    score: number;
    risks: CredibilityRisk[];
    cached: boolean;
  } | null>(null);
  const [credibilityLoading, setCredibilityLoading] = useState(false);

  const [compareOpen, setCompareOpen] = useState(false);
  const [compareData, setCompareData] = useState<{
    dimensions: { name: string; comparison: string; winner: string }[];
    summary: string;
    ranking: { name: string; reason: string }[];
  } | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const [interviewOpen, setInterviewOpen] = useState(false);
  const [interviewData, setInterviewData] = useState<{
    questions: {
      category: string;
      question: string;
      intent: string;
      follow_up: string;
    }[];
  } | null>(null);
  const [interviewLoading, setInterviewLoading] = useState(false);

  // Fetch jobs
  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then(setJobs)
      .catch(() => toast.error("加载岗位列表失败"));
  }, []);

  // Load results + feedback when job selected
  const loadResults = useCallback(async (jobId: string) => {
    if (!jobId) return;
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const [resultsRes, feedbackRes] = await Promise.all([
        fetch(`/api/jobs/${jobId}/results`),
        fetch(`/api/jobs/${jobId}/feedback`),
      ]);
      if (resultsRes.ok) {
        const data = await resultsRes.json();
        setResults(data);
      } else {
        setResults([]);
      }
      if (feedbackRes.ok) {
        const fbData: Feedback[] = await feedbackRes.json();
        const map: Record<number, Feedback> = {};
        fbData.forEach((fb) => {
          map[fb.resume_id] = fb;
        });
        setFeedbackMap(map);
      }
    } catch {
      toast.error("加载匹配结果失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedJobId) loadResults(selectedJobId);
  }, [selectedJobId, loadResults]);

  const handleMatch = async () => {
    if (!selectedJobId) {
      toast.error("请先选择岗位");
      return;
    }
    setMatching(true);
    try {
      const res = await fetch(`/api/jobs/${selectedJobId}/match`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("匹配失败");
      const data = await res.json();
      setResults(data);
      setSelectedIds(new Set());
      toast.success(`匹配完成，共 ${data.length} 位候选人`);
    } catch {
      toast.error("匹配失败");
    } finally {
      setMatching(false);
    }
  };

  const toggleSelect = (resumeId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(resumeId)) next.delete(resumeId);
      else next.add(resumeId);
      return next;
    });
  };

  // ─── Feedback ───

  const sendFeedback = async (
    resumeId: number,
    update: { vote?: "up" | "down" | null; status?: string }
  ) => {
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: Number(selectedJobId),
          resume_id: resumeId,
          ...update,
        }),
      });
      if (!res.ok) throw new Error();
      setFeedbackMap((prev) => ({
        ...prev,
        [resumeId]: {
          ...prev[resumeId],
          job_id: Number(selectedJobId),
          resume_id: resumeId,
          ...update,
        } as Feedback,
      }));
    } catch {
      toast.error("反馈提交失败");
    }
  };

  // ─── Credibility ───

  const openCredibility = async (resumeId: number) => {
    setCredibilityData(null);
    setCredibilityOpen(true);
    setCredibilityLoading(true);
    try {
      const res = await fetch(`/api/resumes/${resumeId}/credibility`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCredibilityData({
        score: data.credibility_score,
        risks: data.risks || [],
        cached: data.cached || false,
      });
    } catch {
      toast.error("可信度检测失败");
      setCredibilityOpen(false);
    } finally {
      setCredibilityLoading(false);
    }
  };

  // ─── Compare ───

  const openCompare = async () => {
    const selected = results.filter((r) => selectedIds.has(r.resume_id));
    if (selected.length < 2) {
      toast.error("请至少选择2位候选人");
      return;
    }
    setCompareData(null);
    setCompareOpen(true);
    setCompareLoading(true);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: Number(selectedJobId),
          resume_ids: Array.from(selectedIds),
        }),
      });
      if (!res.ok) throw new Error();
      setCompareData(await res.json());
    } catch {
      toast.error("对比分析失败");
      setCompareOpen(false);
    } finally {
      setCompareLoading(false);
    }
  };

  // ─── Interview ───

  const openInterview = async (resumeId: number) => {
    setInterviewData(null);
    setInterviewOpen(true);
    setInterviewLoading(true);
    try {
      const res = await fetch("/api/interview/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: Number(selectedJobId),
          resume_id: resumeId,
        }),
      });
      if (!res.ok) throw new Error();
      setInterviewData(await res.json());
    } catch {
      toast.error("面试题生成失败");
      setInterviewOpen(false);
    } finally {
      setInterviewLoading(false);
    }
  };

  // ─── Sort results by score desc ───

  const sortedResults = [...results].sort(
    (a, b) => b.overall_score - a.overall_score
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">匹配筛选</h1>
        <p className="text-sm text-muted-foreground">
          选择岗位，AI智能匹配候选人
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="h-8 w-64 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
        >
          <option value="">选择岗位...</option>
          {jobs.map((job) => (
            <option key={job.id} value={String(job.id)}>
              {job.title}
            </option>
          ))}
        </select>
        <Button
          onClick={handleMatch}
          disabled={!selectedJobId || matching}
        >
          {matching && <Loader2Icon className="size-4 animate-spin" />}
          {matching ? "匹配中..." : "开始匹配"}
        </Button>
        {selectedIds.size >= 2 && (
          <Button variant="outline" onClick={openCompare}>
            <ScaleIcon className="size-4" />
            对比候选人 ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <UsersIcon className="size-10 mb-2" />
          <p className="text-lg font-medium">暂无匹配结果</p>
          <p className="text-sm">选择岗位后点击"开始匹配"</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedResults.map((result) => (
            <MatchResultCard
              key={result.id}
              result={result}
              feedback={feedbackMap[result.resume_id]}
              selected={selectedIds.has(result.resume_id)}
              onToggleSelect={() => toggleSelect(result.resume_id)}
              onFeedback={(update) =>
                sendFeedback(result.resume_id, update)
              }
              onCredibility={() => openCredibility(result.resume_id)}
              onInterview={() => openInterview(result.resume_id)}
            />
          ))}
        </div>
      )}

      {/* Credibility Modal */}
      <Dialog open={credibilityOpen} onOpenChange={setCredibilityOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>可信度检测</DialogTitle>
            <DialogDescription>
              AI分析简历可信度与风险点
            </DialogDescription>
          </DialogHeader>
          {credibilityLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2Icon className="size-8 animate-spin text-primary" />
            </div>
          ) : credibilityData ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div
                  className={`flex size-20 items-center justify-center rounded-full border-4 ${scoreBorder(credibilityData.score)}`}
                >
                  <span
                    className={`text-2xl font-bold ${scoreColor(credibilityData.score)}`}
                  >
                    {credibilityData.score}
                  </span>
                </div>
                <div>
                  <p className="text-lg font-medium">
                    {credibilityData.score >= 80
                      ? "可信度高"
                      : credibilityData.score >= 60
                      ? "可信度中等"
                      : "可信度偏低"}
                  </p>
                  {credibilityData.cached && (
                    <p className="text-xs text-muted-foreground">
                      (缓存结果)
                    </p>
                  )}
                </div>
              </div>
              {credibilityData.risks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">风险点</h4>
                  {credibilityData.risks.map((risk, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border p-3 ${
                        risk.severity === "high"
                          ? "border-red-200 bg-red-50"
                          : risk.severity === "medium"
                          ? "border-orange-200 bg-orange-50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            risk.severity === "high"
                              ? "destructive"
                              : risk.severity === "medium"
                              ? "outline"
                              : "secondary"
                          }
                        >
                          {risk.type}
                        </Badge>
                        <span
                          className={`text-xs ${
                            risk.severity === "high"
                              ? "text-red-600"
                              : risk.severity === "medium"
                              ? "text-orange-600"
                              : "text-gray-500"
                          }`}
                        >
                          {risk.severity === "high"
                            ? "高风险"
                            : risk.severity === "medium"
                            ? "中风险"
                            : "低风险"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {risk.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              关闭
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare Modal */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>候选人对比分析</DialogTitle>
            <DialogDescription>
              AI多维度对比所选候选人
            </DialogDescription>
          </DialogHeader>
          {compareLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2Icon className="size-8 animate-spin text-primary" />
            </div>
          ) : compareData ? (
            <div className="space-y-4">
              {/* Dimensions */}
              {compareData.dimensions && compareData.dimensions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">维度对比</h4>
                  <div className="space-y-2">
                    {compareData.dimensions.map((dim, i) => (
                      <div key={i} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{dim.name}</span>
                          {dim.winner && (
                            <Badge variant="secondary">
                              优胜：{dim.winner}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {dim.comparison}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Ranking */}
              {compareData.ranking && compareData.ranking.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">综合排名</h4>
                  <div className="space-y-1.5">
                    {compareData.ranking.map((r, i) => {
                      const medals = ["🥇", "🥈", "🥉"];
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-lg border p-2.5"
                        >
                          <span className="text-lg">
                            {medals[i] || `#${i + 1}`}
                          </span>
                          <div>
                            <span className="font-medium">{r.name}</span>
                            <p className="text-xs text-muted-foreground">
                              {r.reason}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Summary */}
              {compareData.summary && (
                <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                  <h4 className="mb-1 font-medium">总结</h4>
                  <p>{compareData.summary}</p>
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              关闭
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interview Modal */}
      <Dialog open={interviewOpen} onOpenChange={setInterviewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>面试题生成</DialogTitle>
            <DialogDescription>
              基于候选人简历与岗位要求的定制化面试题
            </DialogDescription>
          </DialogHeader>
          {interviewLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2Icon className="size-8 animate-spin text-primary" />
            </div>
          ) : interviewData ? (
            <InterviewQuestions questions={interviewData.questions} />
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              关闭
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Interview Questions Component ───

const categoryColors: Record<string, string> = {
  技术: "bg-blue-100 text-blue-700",
  项目: "bg-purple-100 text-purple-700",
  行为: "bg-green-100 text-green-700",
  情景: "bg-orange-100 text-orange-700",
  专业: "bg-indigo-100 text-indigo-700",
};

function getCategoryColor(cat: string) {
  for (const key of Object.keys(categoryColors)) {
    if (cat.includes(key)) return categoryColors[key];
  }
  return "bg-gray-100 text-gray-700";
}

function InterviewQuestions({
  questions,
}: {
  questions: {
    category: string;
    question: string;
    intent: string;
    follow_up: string;
  }[];
}) {
  // Group by category
  const grouped: Record<string, typeof questions> = {};
  questions.forEach((q) => {
    if (!grouped[q.category]) grouped[q.category] = [];
    grouped[q.category].push(q);
  });

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, qs]) => (
        <div key={category} className="space-y-2">
          <Badge
            className={getCategoryColor(category)}
            variant="secondary"
          >
            {category}
          </Badge>
          {qs.map((q, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-1.5">
              <p className="font-medium">{q.question}</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">考察意图：</span>
                {q.intent}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">追问方向：</span>
                {q.follow_up}
              </p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Match Result Card ───

function MatchResultCard({
  result,
  feedback,
  selected,
  onToggleSelect,
  onFeedback,
  onCredibility,
  onInterview,
}: {
  result: MatchResult;
  feedback?: Feedback;
  selected: boolean;
  onToggleSelect: () => void;
  onFeedback: (update: { vote?: "up" | "down" | null; status?: string }) => void;
  onCredibility: () => void;
  onInterview: () => void;
}) {
  const parsed = result.parsed_data;
  const name = parsed?.name || result.filename || `简历 #${result.resume_id}`;
  const analysis = parseAnalysis(result.analysis || "");
  const rec = getRecommendation(result.overall_score, result.filter_passed);
  const status = feedback?.status || "pending";
  const vote = feedback?.vote || null;

  const cardClasses = [
    "transition-all",
    !result.filter_passed && "opacity-60",
    status === "hired" && "border-l-4 border-l-green-500",
    status === "rejected" && "opacity-50",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Card className={cardClasses}>
      <CardHeader>
        <div className="flex items-center gap-3">
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="size-4 rounded border-gray-300 accent-primary"
          />
          {/* Score circle */}
          <div
            className={`flex size-12 shrink-0 items-center justify-center rounded-full border-3 ${scoreBorder(result.overall_score)}`}
          >
            <span
              className={`text-base font-bold ${scoreColor(result.overall_score)}`}
            >
              {result.overall_score}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="flex flex-wrap items-center gap-2">
              {name}
              <Badge variant={rec.variant}>{rec.label}</Badge>
              {!result.filter_passed && (
                <Badge variant="destructive">未达硬性条件</Badge>
              )}
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score bars */}
        <div className="space-y-2">
          <ScoreBar label="技能匹配" score={result.skill_score} />
          <ScoreBar label="经验匹配" score={result.experience_score} />
          <ScoreBar label="学历匹配" score={result.education_score} />
        </div>

        {/* Analysis sections */}
        <div className="grid gap-2 sm:grid-cols-3">
          {analysis.advantages && (
            <div className="rounded-lg bg-green-50 p-3 text-sm">
              <h5 className="mb-1 font-medium text-green-700">优势</h5>
              <p className="text-green-800 text-xs">{analysis.advantages}</p>
            </div>
          )}
          {analysis.disadvantages && (
            <div className="rounded-lg bg-orange-50 p-3 text-sm">
              <h5 className="mb-1 font-medium text-orange-700">不足</h5>
              <p className="text-orange-800 text-xs">
                {analysis.disadvantages}
              </p>
            </div>
          )}
          {analysis.suggestions && (
            <div className="rounded-lg bg-blue-50 p-3 text-sm">
              <h5 className="mb-1 font-medium text-blue-700">建议</h5>
              <p className="text-blue-800 text-xs">{analysis.suggestions}</p>
            </div>
          )}
        </div>

        {/* Filter detail */}
        {!result.filter_passed && result.filter_detail && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
            <h5 className="mb-1 font-medium text-red-700">
              未满足条件
            </h5>
            <ul className="space-y-1">
              {result.filter_detail
                .filter((d) => !d.met)
                .map((d, i) => (
                  <li key={i} className="text-xs text-red-600">
                    {d.condition}：要求 {d.required}，实际 {d.actual}
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <Button variant="outline" size="sm" onClick={onInterview}>
            面试题生成
          </Button>
          <Button variant="outline" size="sm" onClick={onCredibility}>
            可信度检测
          </Button>

          <div className="ml-auto flex items-center gap-2">
            {/* Vote buttons */}
            <Button
              variant={vote === "up" ? "default" : "ghost"}
              size="icon-sm"
              onClick={() =>
                onFeedback({ vote: vote === "up" ? null : "up" })
              }
              title="推荐"
            >
              👍
            </Button>
            <Button
              variant={vote === "down" ? "default" : "ghost"}
              size="icon-sm"
              onClick={() =>
                onFeedback({ vote: vote === "down" ? null : "down" })
              }
              title="不推荐"
            >
              👎
            </Button>

            {/* Status select */}
            <select
              className="h-7 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
              value={status}
              onChange={(e) => onFeedback({ status: e.target.value })}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Score Bar ───

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <div className="h-2 flex-1 rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${scoreBg(score)}`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <span className={`w-8 text-right text-xs font-medium ${scoreColor(score)}`}>
        {score}
      </span>
    </div>
  );
}
