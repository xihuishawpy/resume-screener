"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Job } from "@/lib/types";
import { PlusIcon, TrashIcon, PencilIcon, SparklesIcon, ChevronDownIcon, ChevronUpIcon, Loader2Icon } from "lucide-react";

const educationOptions = ["不限", "大专", "本科", "硕士", "博士"];
const filterModeOptions = [
  { value: "strict", label: "严格模式" },
  { value: "lenient", label: "宽松模式" },
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [education, setEducation] = useState("不限");
  const [experienceYears, setExperienceYears] = useState(0);
  const [filterMode, setFilterMode] = useState("strict");

  // JD parse state
  const [jdExpanded, setJdExpanded] = useState(false);
  const [jdText, setJdText] = useState("");
  const [parsing, setParsing] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs");
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setJobs(data);
    } catch {
      toast.error("加载岗位列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setRequiredSkills("");
    setEducation("不限");
    setExperienceYears(0);
    setFilterMode("strict");
    setJdText("");
    setJdExpanded(false);
  };

  const openEditDialog = (job: Job) => {
    setEditingJob(job);
    setTitle(job.title);
    setDescription(job.description || "");
    setRequiredSkills(job.required_skills || "");
    setEducation(job.education || "不限");
    setExperienceYears(job.experience_years || 0);
    setFilterMode(job.filter_mode || "strict");
    setJdText("");
    setJdExpanded(false);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("请输入岗位名称");
      return;
    }
    setSubmitting(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      required_skills: requiredSkills.trim() || null,
      education,
      experience_years: experienceYears,
      filter_mode: filterMode,
    };
    try {
      if (editingJob) {
        const res = await fetch(`/api/jobs/${editingJob.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("更新失败");
        toast.success("岗位更新成功");
      } else {
        const res = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("创建失败");
        toast.success("岗位创建成功");
      }
      resetForm();
      setEditingJob(null);
      setDialogOpen(false);
      fetchJobs();
    } catch {
      toast.error(editingJob ? "更新岗位失败" : "创建岗位失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      toast.success("岗位已删除");
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch {
      toast.error("删除岗位失败");
    }
  };

  const handleParseJD = async () => {
    if (!jdText.trim()) {
      toast.error("请粘贴JD内容");
      return;
    }
    setParsing(true);
    try {
      const res = await fetch("/api/jd/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: jdText }),
      });
      if (!res.ok) throw new Error("解析失败");
      const data = await res.json();
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.required_skills) setRequiredSkills(data.required_skills);
      if (data.education) setEducation(data.education);
      if (data.experience_years != null)
        setExperienceYears(data.experience_years);
      toast.success("JD解析完成，已自动填充表单");
    } catch {
      toast.error("JD解析失败");
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">岗位管理</h1>
          <p className="text-sm text-muted-foreground">
            创建和管理招聘岗位，配置筛选条件
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingJob(null); resetForm(); } }}>
          <DialogTrigger
            render={
              <Button
                size="lg"
                onClick={() => {
                  setEditingJob(null);
                  resetForm();
                }}
              />
            }
          >
            <PlusIcon className="size-4" />
            新建岗位
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingJob ? "编辑岗位" : "新建岗位"}</DialogTitle>
              <DialogDescription>
                {editingJob ? "修改岗位信息" : "填写岗位信息，或粘贴JD自动解析"}
              </DialogDescription>
            </DialogHeader>

            {/* JD智能解析 */}
            <div className="rounded-lg border">
              <button
                type="button"
                className="flex w-full items-center justify-between p-3 text-sm font-medium hover:bg-muted/50"
                onClick={() => setJdExpanded(!jdExpanded)}
              >
                <span className="flex items-center gap-2">
                  <SparklesIcon className="size-4 text-primary" />
                  JD智能解析
                </span>
                {jdExpanded ? (
                  <ChevronUpIcon className="size-4" />
                ) : (
                  <ChevronDownIcon className="size-4" />
                )}
              </button>
              {jdExpanded && (
                <div className="space-y-2 border-t p-3">
                  <Textarea
                    placeholder="粘贴岗位描述（JD）内容..."
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    rows={5}
                  />
                  <Button
                    size="sm"
                    onClick={handleParseJD}
                    disabled={parsing}
                  >
                    {parsing && (
                      <Loader2Icon className="size-3 animate-spin" />
                    )}
                    {parsing ? "解析中..." : "AI解析"}
                  </Button>
                </div>
              )}
            </div>

            {/* Form fields */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>
                  岗位名称 <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="如：高级前端工程师"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>岗位描述</Label>
                <Textarea
                  placeholder="岗位职责与要求..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>技能要求</Label>
                <Input
                  placeholder="如：React, TypeScript, Node.js（逗号分隔）"
                  value={requiredSkills}
                  onChange={(e) => setRequiredSkills(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>学历要求</Label>
                  <Select value={education} onValueChange={(v) => v && setEducation(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {educationOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>经验要求（年）</Label>
                  <Input
                    type="number"
                    min={0}
                    value={experienceYears}
                    onChange={(e) =>
                      setExperienceYears(Number(e.target.value))
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>筛选模式</Label>
                <Select value={filterMode} onValueChange={(v) => v && setFilterMode(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择筛选模式">
                      {filterModeOptions.find(o => o.value === filterMode)?.label || filterMode}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {filterModeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                取消
              </DialogClose>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && (
                  <Loader2Icon className="size-4 animate-spin" />
                )}
                {submitting ? (editingJob ? "保存中..." : "创建中...") : (editingJob ? "保存修改" : "创建岗位")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Job list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-lg font-medium">暂无岗位</p>
          <p className="text-sm">点击"新建岗位"开始创建</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardHeader>
                <CardTitle>{job.title}</CardTitle>
                <CardAction>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditDialog(job)}
                    >
                      <PencilIcon className="size-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(job.id)}
                    >
                      <TrashIcon className="size-4 text-destructive" />
                    </Button>
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-3">
                {job.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {job.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {job.required_skills
                    ?.split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>学历：{job.education}</span>
                  <span>经验：{job.experience_years}年</span>
                  <Badge
                    variant={
                      job.filter_mode === "strict" ? "destructive" : "outline"
                    }
                  >
                    {job.filter_mode === "strict" ? "严格" : "宽松"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
