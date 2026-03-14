import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const { job_id, resume_id, vote, status } = await req.json();

  if (!job_id || !resume_id) return NextResponse.json({ error: "缺少参数" }, { status: 400 });

  const { data: existing } = await supabase
    .from("feedback")
    .select("id")
    .eq("job_id", job_id)
    .eq("resume_id", resume_id)
    .single();

  if (existing) {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (vote !== undefined) updates.vote = vote;
    if (status !== undefined) updates.status = status;
    await supabase.from("feedback").update(updates).eq("id", existing.id);
    return NextResponse.json({ id: existing.id, message: "反馈已保存" });
  } else {
    const { data, error } = await supabase
      .from("feedback")
      .insert({ job_id, resume_id, vote: vote || null, status: status || "pending" })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id, message: "反馈已保存" });
  }
}
