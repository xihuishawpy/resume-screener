export function resumeParsePrompt(text: string): string {
  return `你是一个专业的简历解析助手。请从以下简历文本中提取结构化信息，以JSON格式返回。

**重要：必须保留简历中的原始内容，不要总结、缩写或改写任何信息。直接搬运原文。**

要求提取的字段：
- name: 姓名（原文）
- phone: 电话（原文）
- email: 邮箱（原文）
- education: 最高学历（如：本科、硕士、博士）
- school: 毕业院校（原文）
- major: 专业（原文）
- skills: 技能列表（数组，保留简历中提到的所有技能，原文）
- experience_years: 工作年限（数字）
- work_experience: 工作经历列表，每项包含 company(公司名原文)、title(职位原文)、duration(时间段原文)、description(工作内容，必须保留原文完整描述)
- education_experience: 教育经历列表，每项包含 school(学校)、major(专业)、degree(学历)、duration(时间段)
- project_experience: 项目经历列表（如有），每项包含 name(项目名)、role(角色)、duration(时间段)、description(项目描述，保留原文完整内容)
- certifications: 证书/资质列表（如有，原文）
- self_evaluation: 自我评价（如有，保留原文完整内容）

如果某个字段无法从简历中获取，设为null。只返回JSON，不要其他内容。

简历文本：
${text.slice(0, 8000)}`;
}

export function jdParsePrompt(text: string): string {
  return `你是一个专业的HR助手。请从以下岗位描述（JD）中提取结构化信息，以JSON格式返回。

要求提取的字段：
- title: 职位名称
- description: 岗位职责概述（保留原文要点）
- required_skills: 要求的技能，用逗号分隔（如：Python, SQL, Docker）
- education: 最低学历要求（大专/本科/硕士/博士/不限）
- experience_years: 最低工作年限（数字，如无要求填0）

只返回JSON，不要其他内容。

JD原文：
${text.slice(0, 6000)}`;
}

export function matchPrompt(
  job: { title: string; description?: string | null; required_skills?: string | null; education?: string | null; experience_years?: number | null },
  resumeData: string,
  jobProfile?: string | null,
): string {
  let prompt = `你是一个专业的HR招聘助手。请根据岗位要求对候选人进行评估打分。

## 岗位信息
- 职位：${job.title}
- 描述：${job.description || "无"}
- 要求技能：${job.required_skills || "无"}
- 学历要求：${job.education || "不限"}
- 经验要求：${job.experience_years || 0}年以上

## 候选人简历信息
${resumeData.slice(0, 6000)}

## 评分要求
请从以下维度进行评分（0-100分），并给出分析：

1. skill_score: 技能匹配度
2. experience_score: 经验匹配度
3. education_score: 学历匹配度
4. overall_score: 综合评分
5. analysis: 详细分析，包含：
   - 优势：候选人的突出优点
   - 不足：与岗位要求的差距
   - 建议：招聘建议

请以JSON格式返回，只返回JSON，不要其他内容。`;

  if (jobProfile) {
    prompt += `

## 历史录用参考
该岗位过去录用/好评的候选人有以下共同特征：
${jobProfile}
请参考以上画像，在评分时适当考虑候选人与成功画像的契合度。`;
  }

  return prompt;
}

export function credibilityPrompt(resumeData: string): string {
  return `你是一位资深HR背景调查专家。请对以下简历信息进行可信度评估，检测潜在的风险点。

## 简历信息
${resumeData.slice(0, 8000)}

## 检测维度
1. **时间线矛盾**：工作/教育经历时间是否重叠、空窗期是否异常长（超过1年未解释）
2. **技能与经历不匹配**：声称掌握的技能是否在工作/项目经历中有体现
3. **描述夸大嫌疑**：职级与所述职责是否匹配
4. **内容空泛度**：工作描述是否具体（有量化数据、具体技术方案），还是笼统模糊

## 返回格式
以JSON格式返回，只返回JSON：
{
    "credibility_score": 0-100,
    "risks": [
        {
            "type": "时间矛盾|技能不符|夸大嫌疑|内容空泛",
            "severity": "high|medium|low",
            "description": "具体说明"
        }
    ]
}`;
}

export function comparePrompt(
  job: { title: string; description?: string | null; required_skills?: string | null },
  candidatesData: string,
): string {
  return `你是一位资深HR顾问。请对以下候选人进行综合对比分析。

## 岗位信息
- 职位：${job.title}
- 描述：${job.description || "无"}
- 要求技能：${job.required_skills || "无"}

## 候选人信息
${candidatesData.slice(0, 8000)}

## 要求
请进行全面对比分析，返回JSON格式：
{
  "dimensions": [
    {
      "name": "维度名称",
      "comparison": "各候选人在此维度的对比分析",
      "winner": "此维度最优候选人姓名"
    }
  ],
  "summary": "综合推荐意见",
  "ranking": [
    { "name": "候选人姓名", "rank": 1, "reason": "排名理由" }
  ]
}

只返回JSON，不要其他内容。`;
}

export function interviewPrompt(
  job: { title: string; description?: string | null; required_skills?: string | null; education?: string | null; experience_years?: number | null },
  resumeData: string,
): string {
  return `你是一位资深面试官。请根据岗位要求和候选人简历信息，生成有针对性的面试问题。

## 岗位信息
- 职位：${job.title}
- 描述：${job.description || "无"}
- 要求技能：${job.required_skills || "无"}
- 学历要求：${job.education || "不限"}
- 经验要求：${job.experience_years || 0}年以上

## 候选人简历
${resumeData.slice(0, 6000)}

## 要求
请生成 6-8 个面试问题，分为以下类别：
1. 技术能力验证（2-3题）
2. 经验深度探查（2题）
3. 短板探测（1-2题）
4. 综合素质（1题）

每个问题包含：
- category: 类别
- question: 面试问题
- intent: 考察意图
- follow_up: 追问方向

以JSON格式返回，格式为 {"questions": [...]}，只返回JSON。`;
}

export function profilePrompt(candidatesData: string): string {
  return `你是一位资深HR顾问。以下是某个岗位过去获得好评或被录用的候选人简历信息。请总结这些成功候选人的共同特征画像。

## 成功候选人简历
${candidatesData.slice(0, 8000)}

## 要求
请用简洁的中文总结以下方面的共性（如果有）：
- 技能偏好：哪些技能是成功候选人普遍具备的
- 经验类型：什么类型的工作/项目经验比较突出
- 背景特征：学历、行业背景等共同点
- 其他特征：任何值得注意的共性

直接输出总结文本，不需要JSON格式，控制在200字以内。`;
}
