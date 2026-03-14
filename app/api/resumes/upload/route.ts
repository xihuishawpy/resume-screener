import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { openai, MODEL_NAME } from "@/lib/openai";
import { resumeParsePrompt } from "@/lib/prompts";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") {
    const data = await pdfParse(buffer);
    return data.text;
  } else if (ext === "docx" || ext === "doc") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } else {
    return buffer.toString("utf-8");
  }
}

async function analyzeResume(text: string) {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: "你是一个专业的简历解析助手，只返回JSON格式数据。" },
        { role: "user", content: resumeParsePrompt(text) },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });
    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (e: unknown) {
    return { error: String(e), name: null, skills: [], experience_years: 0 };
  }
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const files = formData.getAll("files") as File[];
  if (!files.length) return NextResponse.json({ error: "没有上传文件" }, { status: 400 });

  const results = [];
  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "doc", "txt"].includes(ext || "")) {
      results.push({ filename: file.name, error: "不支持的文件格式" });
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await extractText(buffer, file.name);
    if (!rawText.trim()) {
      results.push({ filename: file.name, error: "无法提取文本内容" });
      continue;
    }

    const parsedData = await analyzeResume(rawText);
    const { data, error } = await supabase
      .from("resumes")
      .insert({ filename: file.name, raw_text: rawText, parsed_data: parsedData })
      .select("id")
      .single();

    if (error) {
      results.push({ filename: file.name, error: error.message });
    } else {
      results.push({ id: data.id, filename: file.name, parsed_data: parsedData, message: "上传解析成功" });
    }
  }
  return NextResponse.json(results);
}
