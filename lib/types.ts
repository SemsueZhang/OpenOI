export type Locale = 'zh' | 'en';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type TargetType = 'solution' | 'hack';
export type HackStatus = 'pending' | 'valid' | 'invalid';
export type SolutionStatus = 'normal' | 'disputed' | 'hacked';

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
  source: string;
  external_url: string | null;
  difficulty: Difficulty;
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
  algorithm: string;
  content_md: string;
  code: string;
  language: string;
  time_complexity: string;
  space_complexity: string;
  status: SolutionStatus;
  created_at: string;
  updated_at: string;
  author?: Profile | null;
  useful_votes?: number;
  hack_count?: number;
  my_vote?: number | null;
}

export interface Hack {
  id: string;
  solution_id: string;
  author_id: string;
  type: 'counterexample' | 'logic' | 'complexity' | 'boundary';
  content_md: string;
  input_data: string;
  expected_output: string;
  actual_output: string;
  status: HackStatus;
  created_at: string;
  author?: Profile | null;
  valid_votes?: number;
  invalid_votes?: number;
  my_vote?: number | null;
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
  source?: string;
  difficulty?: Difficulty | '';
  tag?: string;
  page?: number;
}

export interface Paged<T> { items: T[]; page: number; total: number; pages: number; }
export type ActionResult = { ok: true; id?: string; message?: string; redirectTo?: string } | { ok: false; error: string };
export type ProblemInput = Pick<Problem, 'title' | 'source' | 'external_url' | 'difficulty' | 'tags' | 'statement_md'>;
export type SolutionInput = Pick<Solution, 'problem_id' | 'title' | 'algorithm' | 'content_md' | 'code' | 'language' | 'time_complexity' | 'space_complexity'>;
export type HackInput = Pick<Hack, 'solution_id' | 'type' | 'content_md' | 'input_data' | 'expected_output' | 'actual_output'>;
export type ProfileInput = Pick<Profile, 'username' | 'avatar_url'>;
