export type Locale = 'zh' | 'en';
export type TargetType = 'solution';

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Problem {
  id: string;
  created_by: string;
  title: string;
  source_urls: string[];
  similar_urls: string[];
  tags: string[];
  statement_md: string;
  created_at: string;
  author?: Profile | null;
  solution_count?: number;
}

export interface Solution {
  id: string;
  problem_id: string;
  author_id: string;
  title: string;
  content_md: string;
  original_url: string;
  created_at: string;
  updated_at: string;
  author?: Profile | null;
}

export interface Comment {
  id: string;
  author_id: string;
  target_type: TargetType;
  target_id: string;
  content_md: string;
  created_at: string;
  author?: Profile | null;
}

export interface ProblemFilters {
  q?: string;
  tag?: string;
  page?: number;
}

export interface Paged<T> { items: T[]; page: number; total: number; pages: number; }
export type ActionResult = { ok: true; id?: string; message?: string; redirectTo?: string } | { ok: false; error: string };
export type ProblemInput = Pick<Problem, 'title' | 'source_urls' | 'similar_urls' | 'tags' | 'statement_md'>;
export type SolutionInput = Pick<Solution, 'problem_id' | 'title' | 'content_md' | 'original_url'>;
export type ProfileInput = Pick<Profile, 'username' | 'avatar_url'>;
