# Backend interface for UI

Types live in `lib/types.ts`, server queries in `lib/data.ts`, actions in `app/actions.ts`.

`Problem`: title, statement_md (1000 Unicode codepoints), tags (fixed taxonomy), source_urls and similar_urls (HTTP(S) arrays), author metadata and solution_count. `Solution`: problem_id, title, content_md (summary, 1000 codepoints), original_url (required HTTP(S)), author metadata and timestamps. Comments target solutions only and contain at most 100 codepoints. Shared validation and `PROBLEM_TAGS` live in `lib/security.ts`.

Queries: getCurrentUser, getProblems({q,tag,page}), getProblem(id), getSolutions(problemId,page), getSolution(id), getComments('solution',id,page), getProfileByUsername(username), getUserContent(userId,{problems,solutions}). Lists have 20 rows per page, exact totals, stable descending creation/id ordering and out-of-range fallback. Missing Supabase configuration returns empty/null.

Actions accept FormData and return ActionResult with pending/error handling in client components:

- signUp: email, password, username, redirectTo.
- signIn: email, password, redirectTo.
- resendConfirmation: email, redirectTo; neutral success response.
- signOut: no fields.
- saveProfile: username, avatar_url.
- saveProblem: optional id, title, statement_md, tags (comma-separated), source_urls and similar_urls (newline-separated).
- saveSolution: optional id, problem_id, title, content_md, original_url.
- saveComment: optional id, target_type ('solution'), target_id, content_md.
- deleteProblem, deleteSolution, deleteComment: id.
- setLocale: locale (zh/en), optional redirectTo.

Authors and ownership are verified again on the server and enforced by database RLS/column grants. Editing content cannot transfer authorship or targets. All redirects use safe site paths. No Hack, vote, status, algorithm, complexity, language or code submission API remains.

Auth confirmation supports PKCE code and token_hash/type=email. Cookie openoi_locale persists UI language without translating user content.
