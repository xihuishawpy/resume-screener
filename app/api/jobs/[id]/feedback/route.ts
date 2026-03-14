import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabase
    .from("feedback")
    .select("*, resumes(filename, parsed_data)")
    .eq("job_id", id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = (data || []).map(f => ({
    ...f,
    filename: (f as Record<string, unknown>).resumes && typeof (f as Record<string, unknown>).resumes === "object" ? ((f as Record<string, unknown>).resumes as Record<string, unknown>).filename : undefined,
    candidate_name: (f as Record<string, unknown>).resumes && typeof (f as Record<string, unknown>).resumes === "object" ? ((f as Record<string, unknown>).resumes as Record<string, unknown>).parsed_data && typeof ((f as Record<string, unknown>).resumes as Record<string, unknown>).parsed_data === "object" ? (((f as Record<string, unknown>).resumes as Record<string, unknown>).parsed_data as Record<string, unknown>)?.name : null : null,
    resumes: undefined,
  }));
  return NextResponse.json(results);
}
