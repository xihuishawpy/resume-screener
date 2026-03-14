import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabase
    .from("match_results")
    .select("*, resumes(filename, parsed_data)")
    .eq("job_id", id)
    .order("filter_passed", { ascending: false })
    .order("overall_score", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = (data || []).map(r => ({
    ...r,
    filename: (r as Record<string, unknown>).resumes && typeof (r as Record<string, unknown>).resumes === "object" ? ((r as Record<string, unknown>).resumes as Record<string, unknown>).filename : undefined,
    parsed_data: (r as Record<string, unknown>).resumes && typeof (r as Record<string, unknown>).resumes === "object" ? ((r as Record<string, unknown>).resumes as Record<string, unknown>).parsed_data : undefined,
    resumes: undefined,
  }));
  return NextResponse.json(results);
}
