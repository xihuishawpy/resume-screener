import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabase.from("jobs").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: "岗位不存在" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { title, description, required_skills, education, experience_years, filter_mode } = body;
  if (!title?.trim()) return NextResponse.json({ error: "职位名称不能为空" }, { status: 400 });

  const { error } = await supabase
    .from("jobs")
    .update({
      title, description: description || "",
      required_skills: required_skills || "",
      education: education || "不限",
      experience_years: experience_years || 0,
      filter_mode: filter_mode || "strict",
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "岗位更新成功" });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabase.from("jobs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "岗位已删除" });
}
