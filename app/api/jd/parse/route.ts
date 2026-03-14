import { NextResponse } from "next/server";
import { openai, MODEL_NAME } from "@/lib/openai";
import { jdParsePrompt } from "@/lib/prompts";

export async function POST(req: Request) {
  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "JD 文本不能为空" }, { status: 400 });

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: "你是一个专业的HR助手，只返回JSON格式数据。" },
        { role: "user", content: jdParsePrompt(text) },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return NextResponse.json({
      title: result.title || "",
      description: result.description || "",
      required_skills: result.required_skills || "",
      education: result.education || "不限",
      experience_years: parseInt(result.experience_years) || 0,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
