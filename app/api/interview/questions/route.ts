import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { openai, MODEL_NAME } from "@/lib/openai";
import { interviewPrompt } from "@/lib/prompts";

export async function POST(req: Request) {
  const { job_id, resume_id } = await req.json();

  const { data: job } = await supabase.from("jobs").select("*").eq("id", job_id).single();
  if (!job) return NextResponse.json({ error: "岗位不存在" }, { status: 404 });

  const { data: resume } = await supabase.from("resumes").select("*").eq("id", resume_id).single();
  if (!resume) return NextResponse.json({ error: "简历不存在" }, { status: 404 });

  try {
    // Compact resume data to reduce tokens and speed up response
    const resumeData = JSON.stringify(resume.parsed_data);
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: "你是一位资深面试官，只返回JSON格式数据。" },
        { role: "user", content: interviewPrompt(job, resumeData) },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return NextResponse.json({ questions: result.questions || result });
  } catch (e: unknown) {
    return NextResponse.json({ questions: [{ category: "错误", question: `生成失败: ${String(e)}`, intent: "", follow_up: "" }] });
  }
}
