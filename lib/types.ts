export interface Job {
  id: number;
  title: string;
  description: string | null;
  required_skills: string | null;
  education: string;
  experience_years: number;
  filter_mode: string;
  created_at: string;
}

export interface Resume {
  id: number;
  filename: string;
  raw_text: string | null;
  parsed_data: ParsedResume | null;
  credibility_score: number | null;
  credibility_detail: CredibilityDetail | null;
  created_at: string;
}

export interface ParsedResume {
  name: string | null;
  phone: string | null;
  email: string | null;
  education: string | null;
  school: string | null;
  major: string | null;
  skills: string[] | null;
  experience_years: number | null;
  work_experience: WorkExperience[] | null;
  education_experience: EducationExperience[] | null;
  project_experience: ProjectExperience[] | null;
  certifications: string[] | null;
  self_evaluation: string | null;
}

export interface WorkExperience {
  company: string;
  title: string;
  duration: string;
  description: string;
}

export interface EducationExperience {
  school: string;
  major: string;
  degree: string;
  duration: string;
}

export interface ProjectExperience {
  name: string;
  role: string;
  duration: string;
  description: string;
}

export interface MatchResult {
  id: number;
  job_id: number;
  resume_id: number;
  skill_score: number;
  experience_score: number;
  education_score: number;
  overall_score: number;
  analysis: string;
  filter_passed: boolean;
  filter_detail: FilterDetail[] | null;
  created_at: string;
  filename?: string;
  parsed_data?: ParsedResume;
}

export interface FilterDetail {
  condition: string;
  required: string | number;
  actual: string | number;
  met: boolean;
}

export interface FilterResult {
  passed: boolean;
  details: FilterDetail[];
}

export interface CredibilityDetail {
  risks: CredibilityRisk[];
}

export interface CredibilityRisk {
  type: string;
  severity: "high" | "medium" | "low";
  description: string;
}

export interface Feedback {
  id: number;
  job_id: number;
  resume_id: number;
  vote: "up" | "down" | null;
  status: "pending" | "screening" | "interviewing" | "hired" | "rejected";
  created_at: string;
  updated_at: string;
  filename?: string;
  candidate_name?: string;
}
