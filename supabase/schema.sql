CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    required_skills TEXT,
    education TEXT DEFAULT '不限',
    experience_years INT DEFAULT 0,
    filter_mode TEXT DEFAULT 'strict',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE resumes (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    raw_text TEXT,
    parsed_data JSONB,
    credibility_score REAL,
    credibility_detail JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE match_results (
    id SERIAL PRIMARY KEY,
    job_id INT REFERENCES jobs(id) ON DELETE CASCADE,
    resume_id INT REFERENCES resumes(id) ON DELETE CASCADE,
    skill_score REAL DEFAULT 0,
    experience_score REAL DEFAULT 0,
    education_score REAL DEFAULT 0,
    overall_score REAL DEFAULT 0,
    analysis TEXT,
    filter_passed BOOLEAN DEFAULT TRUE,
    filter_detail JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    job_id INT REFERENCES jobs(id) ON DELETE CASCADE,
    resume_id INT REFERENCES resumes(id) ON DELETE CASCADE,
    vote TEXT CHECK (vote IN ('up', 'down')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'screening', 'interviewing', 'hired', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, resume_id)
);
