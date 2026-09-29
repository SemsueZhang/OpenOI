# Backend interface for UI

Import data types from `lib/types.ts`. Import server queries from `lib/data.ts` and server actions from `app/actions.ts`.

Queries: `getCurrentUser(): Promise<{ user: User | null; profile: Profile | null }>`, `getProblems(filters: ProblemFilters): Promise<Paged<Problem>>`, `getProblem(id): Promise<Problem | null>`, `getSolutions(problemId, page): Promise<Paged<Solution>>`, `getSolution(id): Promise<Solution | null>`, `getHack(id): Promise<Hack | null>`, `getHacks(solutionId, page, focusHackId?): Promise<Paged<Hack>>`, `getComments(targetType, targetId, page): Promise<Paged<Comment>>`, `getProfileByUsername(username): Promise<Profile | null>`, `getUserContent(userId, { problems, solutions, hacks }): Promise<{ problems: Paged<Problem>; solutions: Paged<Solution>; hacks: Paged<Hack> }>`. All list queries use 20 rows per page with exact totals. `focusHackId` selects the page containing that Hack for `?hack=<id>#hack-<id>` links. Hack comments are queried only when selected. Queries return empty/null if public Supabase environment variables are absent; `isSupabaseConfigured()` helps render configuration guidance.

All actions below accept a `FormData`, return `Promise<ActionResult>` with `{ok:true,id?,redirectTo?}` or `{ok:false,error}`, and should be called from client components for pending/error display. `redirectTo` is restricted to a relative site path; use the returned path for navigation. Errors are already translated according to the locale cookie. Successful mutations refresh the relevant paths. Form keys:

* `signUp`: email, password, username, redirectTo.
* `signIn`: email, password, redirectTo.
* `resendConfirmation`: email, redirectTo; returns a neutral success message so account existence is not disclosed.
* `signOut`: no keys.
* `saveProfile`: username, avatar_url.
* `saveProblem`: id (optional edit), title, source, external_url, difficulty (`easy|medium|hard`), tags (comma-separated), statement_md.
* `deleteProblem`: id.
* `saveSolution`: id (optional edit), problem_id, title, algorithm, content_md, code, language, time_complexity, space_complexity.
* `deleteSolution`: id.
* `saveHack`: id (optional edit), solution_id, type (`counterexample|logic|complexity|boundary`), content_md, input_data, expected_output, actual_output.
* `deleteHack`: id.
* `saveComment`: id (optional edit), target_type (`solution|hack`), target_id, content_md.
* `deleteComment`: id.
* `setVote`: target_type (`solution|hack`), target_id, value (`1`, `-1`, or empty to retract).
* `setLocale`: locale (`zh|en`) and optional redirectTo.

`/auth/confirm?token_hash=...&type=email&next=/...` exchanges the confirmation token and safely redirects. Auth page should pass `redirectTo` through sign in/up. Cookie locale `openoi_locale` persists the interface choice. User content stays untranslated.
