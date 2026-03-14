import type { Job, ParsedResume, FilterResult } from "./types";

const EDUCATION_LEVELS: Record<string, number> = {
  "博士": 5, "phd": 5, "doctor": 5,
  "硕士": 4, "master": 4, "研究生": 4,
  "本科": 3, "bachelor": 3, "学士": 3,
  "大专": 2, "associate": 2,
  "高中": 1, "high school": 1, "中专": 1,
  "不限": 0,
};

function normalizeEducation(edu: string | null | undefined): number | null {
  if (!edu) return null;
  return EDUCATION_LEVELS[edu.toLowerCase().trim()] ?? null;
}

function skillMatches(required: string, actual: string): boolean {
  const req = required.toLowerCase().trim();
  const act = actual.toLowerCase().trim();
  if (!req || !act) return false;

  if (req === act) return true;

  if (act.startsWith(req)) {
    const rest = act.slice(req.length);
    if (rest && /[a-zA-Z]/.test(rest[0])) return false;
    return true;
  }

  if (act.includes(req)) {
    const idx = act.indexOf(req);
    const beforeOk = idx === 0 || !/[a-zA-Z]/.test(act[idx - 1]);
    const afterIdx = idx + req.length;
    const afterOk = afterIdx >= act.length || !/[a-zA-Z]/.test(act[afterIdx]);
    if (beforeOk && afterOk) return true;
  }

  return false;
}

export function filterResume(job: Job, resume: ParsedResume, filterMode: string = "strict"): FilterResult {
  const details: FilterResult["details"] = [];
  const isStrict = filterMode === "strict";

  // Education
  const jobEdu = job.education;
  if (jobEdu && jobEdu !== "不限") {
    const jobLevel = normalizeEducation(jobEdu);
    const resumeEdu = resume.education;
    const resumeLevel = normalizeEducation(resumeEdu);

    if (resumeLevel === null) {
      details.push({ condition: "学历", required: jobEdu, actual: resumeEdu || "未知", met: !isStrict });
    } else {
      details.push({ condition: "学历", required: jobEdu, actual: resumeEdu!, met: resumeLevel >= (jobLevel ?? 0) });
    }
  }

  // Experience years
  const jobExp = job.experience_years ?? 0;
  if (jobExp > 0) {
    const resumeExp = resume.experience_years;
    if (resumeExp == null) {
      details.push({ condition: "工作年限", required: jobExp, actual: "未知", met: !isStrict });
    } else {
      details.push({ condition: "工作年限", required: jobExp, actual: resumeExp, met: resumeExp >= jobExp });
    }
  }

  // Required skills
  const jobSkillsStr = job.required_skills;
  if (jobSkillsStr?.trim()) {
    const requiredSkills = jobSkillsStr.split(",").map(s => s.trim()).filter(Boolean);
    const resumeSkills = resume.skills ?? [];

    if (!resumeSkills.length && requiredSkills.length) {
      for (const req of requiredSkills) {
        details.push({ condition: "必备技能", required: req, actual: "未找到", met: !isStrict });
      }
    } else {
      for (const req of requiredSkills) {
        const matched = resumeSkills.find(rs => skillMatches(req, rs));
        details.push({
          condition: "必备技能",
          required: req,
          actual: matched ?? "未找到",
          met: !!matched,
        });
      }
    }
  }

  return {
    passed: details.length === 0 || details.every(d => d.met),
    details,
  };
}
