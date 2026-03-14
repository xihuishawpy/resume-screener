import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { openai, MODEL_NAME } from "@/lib/openai";
import { comparePrompt } from "@/lib/prompts";

export async function POST(req: Request) {
  const { job_id, resume_ids } = await req.json();

  const { data: job } = await supabase.from("jobs").select("*").eq("id", job_id).single();
  if (!job) return NextResponse.json({ error: "岗位不存在" }, { status: 404 });

  const { data: resumes } = await supabase.from("resumes").select("*").in("id", resume_ids);
  if (!resumes || resumes.length < 2) return NextResponse.json({ error: "至少需要2份简历" }, { status: 400 });

  const candidatesText = resumes.map((r, i) => {
    const name = r.parsed_data?.name || r.filename;
    return `### 候选人${i + 1}：${name}\n${JSON.stringify(r.parsed_data, null, 2)}`;
  }).join("\n");

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: "你是一位资深HR顾问，只返回JSON格式数据。" },
        { role: "user", content: comparePrompt(job, candidatesText) },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });
    return NextResponse.json(JSON.parse(response.choices[0].message.content || "{}"));
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
