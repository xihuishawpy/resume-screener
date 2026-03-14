import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { openai, MODEL_NAME } from "@/lib/openai";
import { credibilityPrompt } from "@/lib/prompts";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "true";

  const { data: resume, error } = await supabase.from("resumes").select("*").eq("id", id).single();
  if (error || !resume) return NextResponse.json({ error: "简历不存在" }, { status: 404 });

  if (!force && resume.credibility_score != null) {
    return NextResponse.json({
      credibility_score: resume.credibility_score,
      risks: resume.credibility_detail?.risks || [],
      cached: true,
    });
  }

  if (!resume.parsed_data) {
    return NextResponse.json({ credibility_score: null, risks: [], error: "简历未解析" });
  }

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: "你是一位资深HR背景调查专家，只返回JSON格式数据。" },
        { role: "user", content: credibilityPrompt(JSON.stringify(resume.parsed_data, null, 2)) },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });
    const result = JSON.parse(response.choices[0].message.content || "{}");
    const score = Number(result.credibility_score) || 0;
    const risks = result.risks || [];

    await supabase.from("resumes").update({
      credibility_score: score,
      credibility_detail: { risks },
    }).eq("id", id);

    return NextResponse.json({ credibility_score: score, risks, cached: false });
  } catch (e: unknown) {
    return NextResponse.json({ credibility_score: null, risks: [], error: `评估失败: ${String(e)}` });
  }
}
