"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import type { Resume, ParsedResume } from "@/lib/types";
import {
  UploadIcon,
  TrashIcon,
  FileTextIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [detailResume, setDetailResume] = useState<Resume | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const fetchResumes = useCallback(async () => {
    try {
      const res = await fetch("/api/resumes");
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setResumes(data);
    } catch {
      toast.error("加载简历列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const uploadFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) =>
      /\.(pdf|docx?|doc)$/i.test(f.name)
    );
    if (validFiles.length === 0) {
      toast.error("请选择 PDF 或 Word 文件");
      return;
    }
    setUploading(true);
    setUploadProgress(`正在上传 ${validFiles.length} 个文件...`);
    try {
      const formData = new FormData();
      validFiles.forEach((f) => formData.append("files", f));
      const res = await fetch("/api/resumes/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("上传失败");
      const data = await res.json();
      toast.success(`成功上传 ${data.length} 份简历`);
      fetchResumes();
    } catch {
      toast.error("上传简历失败");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/resumes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      toast.success("简历已删除");
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast.error("删除简历失败");
    }
  };

  const showDetail = (resume: Resume) => {
    setDetailResume(resume);
    setDetailOpen(true);
  };

  const pd = (r: Resume): ParsedResume | null => r.parsed_data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">简历库</h1>
        <p className="text-sm text-muted-foreground">
          上传并管理候选人简历
        </p>
      </div>

      {/* Upload area */}
      <div
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.doc"
          multiple
          onChange={(e) => {
            if (e.target.files) uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2Icon className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{uploadProgress}</p>
          </div>
        ) : (
          <div className="flex cursor-pointer flex-col items-center gap-2">
            <UploadIcon className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">拖拽文件到此处，或点击上传</p>
            <p className="text-xs text-muted-foreground">
              支持 PDF、DOC、DOCX 格式
            </p>
          </div>
        )}
      </div>

      {/* Resume list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : resumes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-lg font-medium">暂无简历</p>
          <p className="text-sm">上传简历开始使用</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume) => {
            const parsed = pd(resume);
            return (
              <Card key={resume.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileTextIcon className="size-4 text-muted-foreground" />
                    {parsed?.name || resume.filename}
                  </CardTitle>
                  <CardAction>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(resume.id)}
                    >
                      <TrashIcon className="size-4 text-destructive" />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    {resume.filename}
                  </p>
                  {parsed && (
                    <>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {parsed.education && (
                          <span>学历：{parsed.education}</span>
                        )}
                        {parsed.experience_years != null && (
                          <span>经验：{parsed.experience_years}年</span>
                        )}
                      </div>
                      {parsed.skills && parsed.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {parsed.skills.slice(0, 6).map((skill) => (
                            <Badge key={skill} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                          {parsed.skills.length > 6 && (
                            <Badge variant="outline">
                              +{parsed.skills.length - 6}
                            </Badge>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => showDetail(resume)}
                  >
                    详情
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailResume?.parsed_data?.name || detailResume?.filename || "简历详情"}
            </DialogTitle>
            <DialogDescription>{detailResume?.filename}</DialogDescription>
          </DialogHeader>
          {detailResume?.parsed_data && (
            <ResumeDetail data={detailResume.parsed_data} credibilityScore={detailResume.credibility_score} />
          )}
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

function ResumeDetail({
  data,
  credibilityScore,
}: {
  data: ParsedResume;
  credibilityScore: number | null;
}) {
  return (
    <div className="space-y-4 text-sm">
      {/* Basic info */}
      <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3">
        {data.name && (
          <div>
            <span className="text-muted-foreground">姓名：</span>
            {data.name}
          </div>
        )}
        {data.phone && (
          <div>
            <span className="text-muted-foreground">电话：</span>
            {data.phone}
          </div>
        )}
        {data.email && (
          <div>
            <span className="text-muted-foreground">邮箱：</span>
            {data.email}
          </div>
        )}
        {data.education && (
          <div>
            <span className="text-muted-foreground">学历：</span>
            {data.education}
          </div>
        )}
        {data.school && (
          <div>
            <span className="text-muted-foreground">学校：</span>
            {data.school}
          </div>
        )}
        {data.major && (
          <div>
            <span className="text-muted-foreground">专业：</span>
            {data.major}
          </div>
        )}
        {data.experience_years != null && (
          <div>
            <span className="text-muted-foreground">工作年限：</span>
            {data.experience_years}年
          </div>
        )}
        {credibilityScore != null && (
          <div>
            <span className="text-muted-foreground">可信度：</span>
            <span
              className={
                credibilityScore >= 80
                  ? "font-medium text-green-600"
                  : credibilityScore >= 60
                  ? "font-medium text-orange-500"
                  : "font-medium text-red-500"
              }
            >
              {credibilityScore}分
            </span>
          </div>
        )}
      </div>

      {/* Skills */}
      {data.skills && data.skills.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="font-medium">技能标签</h4>
          <div className="flex flex-wrap gap-1.5">
            {data.skills.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Work experience */}
      {data.work_experience && data.work_experience.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">工作经历</h4>
          <div className="space-y-2">
            {data.work_experience.map((exp, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{exp.company}</span>
                  <span className="text-xs text-muted-foreground">
                    {exp.duration}
                  </span>
                </div>
                <p className="text-muted-foreground">{exp.title}</p>
                {exp.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {exp.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project experience */}
      {data.project_experience && data.project_experience.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">项目经历</h4>
          <div className="space-y-2">
            {data.project_experience.map((proj, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{proj.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {proj.duration}
                  </span>
                </div>
                <p className="text-muted-foreground">{proj.role}</p>
                {proj.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {proj.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {data.certifications && data.certifications.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="font-medium">证书资质</h4>
          <div className="flex flex-wrap gap-1.5">
            {data.certifications.map((cert) => (
              <Badge key={cert} variant="outline">
                {cert}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Self evaluation */}
      {data.self_evaluation && (
        <div className="space-y-1.5">
          <h4 className="font-medium">自我评价</h4>
          <p className="rounded-lg bg-muted/50 p-3 text-muted-foreground">
            {data.self_evaluation}
          </p>
        </div>
      )}
    </div>
  );
}
