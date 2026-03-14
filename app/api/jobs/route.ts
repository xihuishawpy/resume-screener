import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { title, description, required_skills, education, experience_years, filter_mode } = body;
  if (!title?.trim()) return NextResponse.json({ error: "职位名称不能为空" }, { status: 400 });

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      title, description: description || "",
      required_skills: required_skills || "",
      education: education || "不限",
      experience_years: experience_years || 0,
      filter_mode: filter_mode || "strict",
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id, message: "岗位创建成功" });
}
