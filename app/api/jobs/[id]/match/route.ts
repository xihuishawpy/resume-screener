import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { openai, MODEL_NAME } from "@/lib/openai";
import { matchPrompt, profilePrompt } from "@/lib/prompts";
import { filterResume } from "@/lib/filter";
import type { Job, ParsedResume } from "@/lib/types";

async function buildJobProfile(jobId: number): Promise<string | null> {
  const { data: feedbacks } = await supabase
    .from("feedback")
    .select("resume_id")
    .eq("job_id", jobId)
    .or("vote.eq.up,status.eq.hired");

  if (!feedbacks?.length) return null;

  const resumeIds = feedbacks.map(f => f.resume_id);
  const { data: resumes } = await supabase
    .from("resumes")
    .select("parsed_data")
    .in("id", resumeIds);

  if (!resumes?.length) return null;

  const candidatesText = resumes
    .map((r, i) => `### 候选人${i + 1}\n${JSON.stringify(r.parsed_data, null, 2)}`)
    .join("\n");

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: "你是一位资深HR顾问，请用简洁中文总结。" },
        { role: "user", content: profilePrompt(candidatesText) },
      ],
      temperature: 0.3,
    });
    return response.choices[0].message.content?.trim() || null;
  } catch {
    return null;
  }
}

function extractScore(data: Record<string, unknown>, key: string): number {
  const val = data[key];
  if (val != null && typeof val !== "object") return Number(val) || 0;
  for (const v of Object.values(data)) {
    if (typeof v === "object" && v && key in (v as Record<string, unknown>)) {
      return Number((v as Record<string, unknown>)[key]) || 0;
    }
  }
  return 0;
}

function extractAnalysis(data: Record<string, unknown>): string {
  const val = data.analysis;
  if (typeof val === "string") return val;
  if (typeof val === "object" && val) {
    return Object.entries(val).map(([k, v]) => `${k}：${v}`).join("\n");
  }
  return JSON.stringify(data);
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobId = parseInt(id);

  const { data: job, error: jobErr } = await supabase.from("jobs").select("*").eq("id", jobId).single();
  if (jobErr || !job) return NextResponse.json({ error: "岗位不存在" }, { status: 404 });

  const { data: resumes } = await supabase.from("resumes").select("*");
  if (!resumes?.length) return NextResponse.json({ error: "没有已上传的简历" }, { status: 400 });

  const filterMode = job.filter_mode || "strict";
  const jobProfile = await buildJobProfile(jobId);
  const results = [];

  for (const resume of resumes) {
    const parsed = resume.parsed_data as ParsedResume | null;
    if (!parsed) continue;

    const filterResult = filterResume(job as Job, parsed, filterMode);

    if (filterMode === "strict" && !filterResult.passed) {
      await supabase.from("match_results").delete().eq("job_id", jobId).eq("resume_id", resume.id);
      await supabase.from("match_results").insert({
        job_id: jobId, resume_id: resume.id,
        skill_score: 0, experience_score: 0, education_score: 0, overall_score: 0,
        analysis: "未通过硬性条件过滤",
        filter_passed: false, filter_detail: filterResult.details,
      });
      results.push({
        resume_id: resume.id, filename: resume.filename,
        skill_score: 0, experience_score: 0, education_score: 0, overall_score: 0,
        analysis: "未通过硬性条件过滤",
        filter_passed: false, filter_detail: filterResult.details,
        parsed_data: parsed,
      });
      continue;
    }

    const resumeText = JSON.stringify(parsed, null, 2);
    try {
      const response = await openai.chat.completions.create({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: "你是一个专业的HR招聘助手，只返回JSON格式数据。" },
          { role: "user", content: matchPrompt(job, resumeText, jobProfile) },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      });
      const matchData = JSON.parse(response.choices[0].message.content || "{}");

      const matchResult = {
        skill_score: extractScore(matchData, "skill_score"),
        experience_score: extractScore(matchData, "experience_score"),
        education_score: extractScore(matchData, "education_score"),
        overall_score: extractScore(matchData, "overall_score"),
        analysis: extractAnalysis(matchData),
      };

      await supabase.from("match_results").delete().eq("job_id", jobId).eq("resume_id", resume.id);
      await supabase.from("match_results").insert({
        job_id: jobId, resume_id: resume.id,
        ...matchResult,
        filter_passed: filterResult.passed,
        filter_detail: filterResult.details,
      });

      results.push({
        resume_id: resume.id, filename: resume.filename,
        ...matchResult,
        filter_passed: filterResult.passed, filter_detail: filterResult.details,
        parsed_data: parsed,
      });
    } catch (e: unknown) {
      results.push({
        resume_id: resume.id, filename: resume.filename,
        skill_score: 0, experience_score: 0, education_score: 0, overall_score: 0,
        analysis: `匹配失败: ${String(e)}`,
        filter_passed: filterResult.passed, filter_detail: filterResult.details,
        parsed_data: parsed,
      });
    }
  }

  results.sort((a, b) => {
    if (a.filter_passed !== b.filter_passed) return a.filter_passed ? -1 : 1;
    return b.overall_score - a.overall_score;
  });

  return NextResponse.json(results);
}
