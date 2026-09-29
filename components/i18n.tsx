'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/lib/types';
import { setLocale } from '@/app/actions';

const zh = {
  brand: 'OpenOI', problems: '题目', explore: '探索题目', newProblem: '发布题目', newSolution: '发布解法', newHack: '提出 Hack',
  login: '登录', register: '注册', logout: '退出登录', profile: '个人主页', settings: '编辑资料', language: '语言',
  homeTitle: '一起把算法讲清楚', homeSub: '发现题目、分享思路，用证据检验每一种解法。',
  heroTitleFirst: '算法竞赛中的', heroTitleSecond: '开放问题', heroDescription: '从一道题出发，分享解法、提出反例，让讨论推动算法走向更清晰的答案。', heroExplore: '探索', heroStepProblem: '问题', heroStepSolution: '算法', heroStepEvidence: '证明', heroScroll: '向下探索', heroDirectory: '题目目录',
  search: '搜索标题', searchPlaceholder: '搜索题目标题…', source: '来源', sourcePlaceholder: '例如 Codeforces', difficulty: '难度', all: '全部', tag: '标签', tagPlaceholder: '输入标签', filter: '筛选', reset: '清除筛选',
  easy: '简单', medium: '中等', hard: '困难', solutions: '解法', solution: '解法', hacks: 'Hack', comments: '评论', votes: '有用票',
  emptyProblems: '还没有符合条件的题目', emptyProblemsHint: '试试调整筛选条件，或发布第一道题。', emptySolutions: '暂无解法', emptySolutionsHint: '分享你的思路，帮助其他人。', emptyHacks: '还没有 Hack', emptyHacksHint: '发现反例？提交证据帮助改进解法。', emptyComments: '暂无评论',
  previous: '上一页', next: '下一页', page: '页', of: '共', readProblem: '查看题目', statement: '题目描述', writeSolution: '写解法', relatedSolutions: '解法列表',
  normal: '正常', disputed: '有争议', hacked: '已被 Hack', pending: '待验证', valid: '有效', invalid: '无效',
  timeComplexity: '时间复杂度', spaceComplexity: '空间复杂度', languageLabel: '语言', code: '代码', evidence: '证据', inputData: '输入', expectedOutput: '期望输出', actualOutput: '实际输出', hackType: '问题类型', authorReply: '解法作者',
  useful: '有用', validVote: '有效', invalidVote: '无效', retract: '撤票', signInToVote: '登录后投票', ownVote: '不能给自己的内容投票',
  writeComment: '发表评论', commentPlaceholder: '补充讨论、解释或回应…', reply: '回应', edit: '编辑', delete: '删除', cancel: '取消', save: '保存', submit: '提交', submitting: '提交中…',
  confirmDeleteProblem: '删除题目会同时删除其解法、Hack、评论和投票。确定继续？', confirmDeleteSolution: '删除解法会同时删除其 Hack、评论和投票。确定继续？', confirmDeleteHack: '删除 Hack 会同时删除其评论和投票。确定继续？', confirmDeleteComment: '确定删除这条评论？',
  newProblemTitle: '发布题目', editProblemTitle: '编辑题目', title: '标题', titlePlaceholder: '为题目取一个清晰的标题', tags: '标签', tagsPlaceholder: '用逗号分隔，例如 DP, 图论', statementLabel: '题面（Markdown）',
  newSolutionTitle: '发布解法', editSolutionTitle: '编辑解法', solutionTitlePlaceholder: '概括你的核心思路', contentLabel: '解法正文（Markdown）', codeOptional: '代码（可选）', languagePlaceholder: '例如 C++17', complexityPlaceholder: '例如 O(n log n)',
  newHackTitle: '提出 Hack', hackTypePlaceholder: '例如边界条件、复杂度、逻辑错误', hackContentLabel: '问题说明（Markdown）', hackHint: '请给出可复现的反例或具体论证。',
  write: '编辑', preview: '预览', previewEmpty: '预览会显示在这里', required: '请填写必填项',
  email: '邮箱', password: '密码', username: '用户名', avatarUrl: '头像 URL', menu: '菜单', pagination: '分页', loading: '正在加载',
  loginTitle: '欢迎回来', registerTitle: '加入 OpenOI', loginHint: '登录后可以发布、评论和投票。', registerHint: '注册后请查收确认邮件。', noAccount: '还没有账号？', hasAccount: '已有账号？', checkEmail: '请查收邮箱并点击确认链接。', emailNotConfirmed: '邮箱尚未验证，请查收确认邮件。',
  profileTitle: '个人资料', profileEditTitle: '编辑资料', memberSince: '加入于', authoredProblems: '发布的题目', authoredSolutions: '发布的解法', authoredHacks: '提出的 Hack',
  notFoundTitle: '找不到这个页面', notFoundText: '内容可能已删除，或链接有误。', goHome: '返回首页', errorTitle: '页面暂时无法加载', retry: '重试',
  configTitle: '需要连接 Supabase', configText: '请按 README 配置环境变量并初始化数据库，之后即可浏览和发布内容。',
  noPermission: '只有作者可以编辑或删除此内容。', signInRequired: '请先登录以继续。', back: '返回', createdBy: '作者', updated: '更新于',
  formFailed: '操作失败，请稍后重试。', saving: '保存中…', markdownHint: '支持 Markdown、代码块和数学公式。',
  externalUrl: '原题链接', externalUrlPlaceholder: 'https://…（可选）', algorithm: '算法', algorithmPlaceholder: '例如二分搜索', counterexample: '反例', logic: '逻辑错误', complexity: '复杂度问题', boundary: '边界条件', userNameHint: '仅小写字母、数字、下划线', deleteConfirm: '删除后无法恢复',
  editHackTitle: '编辑 Hack', footerTagline: '开放的算法，开放的讨论。', confirmError: '确认链接无效或已过期。输入邮箱后可重发确认邮件。', resendConfirmation: '重发确认邮件', resendSent: '如果该邮箱需要确认，我们已发送新的确认链接。',
} as const;

const en: Record<keyof typeof zh, string> = {
  brand: 'OpenOI', problems: 'Problems', explore: 'Explore problems', newProblem: 'New problem', newSolution: 'New solution', newHack: 'Propose a hack',
  login: 'Log in', register: 'Sign up', logout: 'Log out', profile: 'Profile', settings: 'Edit profile', language: 'Language',
  homeTitle: 'Make algorithms easier to understand', homeSub: 'Explore problems, share ideas, and test solutions with evidence.',
  heroTitleFirst: 'Open problems in ', heroTitleSecond: 'competitive programming', heroDescription: 'Start with a problem. Share a solution, bring a counterexample, and turn discussion into a clearer answer.', heroExplore: 'Explore', heroStepProblem: 'Problem', heroStepSolution: 'Algorithm', heroStepEvidence: 'Proof', heroScroll: 'Explore below', heroDirectory: 'Problem directory',
  search: 'Search titles', searchPlaceholder: 'Search problem titles…', source: 'Source', sourcePlaceholder: 'e.g. Codeforces', difficulty: 'Difficulty', all: 'All', tag: 'Tag', tagPlaceholder: 'Enter a tag', filter: 'Apply', reset: 'Clear filters',
  easy: 'Easy', medium: 'Medium', hard: 'Hard', solutions: 'Solutions', solution: 'Solution', hacks: 'Hacks', comments: 'Comments', votes: 'Helpful votes',
  emptyProblems: 'No matching problems', emptyProblemsHint: 'Adjust your filters or post the first problem.', emptySolutions: 'No solutions yet', emptySolutionsHint: 'Share your approach to help others.', emptyHacks: 'No hacks yet', emptyHacksHint: 'Found a counterexample? Share the evidence.', emptyComments: 'No comments yet',
  previous: 'Previous', next: 'Next', page: 'Page', of: 'of', readProblem: 'View problem', statement: 'Problem statement', writeSolution: 'Write a solution', relatedSolutions: 'Solutions',
  normal: 'Normal', disputed: 'Disputed', hacked: 'Hacked', pending: 'Pending', valid: 'Valid', invalid: 'Invalid',
  timeComplexity: 'Time complexity', spaceComplexity: 'Space complexity', languageLabel: 'Language', code: 'Code', evidence: 'Evidence', inputData: 'Input', expectedOutput: 'Expected output', actualOutput: 'Actual output', hackType: 'Issue type', authorReply: 'Solution author',
  useful: 'Helpful', validVote: 'Valid', invalidVote: 'Invalid', retract: 'Remove vote', signInToVote: 'Log in to vote', ownVote: 'You cannot vote on your own post',
  writeComment: 'Post comment', commentPlaceholder: 'Add context, an explanation, or a response…', reply: 'Reply', edit: 'Edit', delete: 'Delete', cancel: 'Cancel', save: 'Save', submit: 'Submit', submitting: 'Submitting…',
  confirmDeleteProblem: 'Deleting this problem also deletes its solutions, hacks, comments, and votes. Continue?', confirmDeleteSolution: 'Deleting this solution also deletes its hacks, comments, and votes. Continue?', confirmDeleteHack: 'Deleting this hack also deletes its comments and votes. Continue?', confirmDeleteComment: 'Delete this comment?',
  newProblemTitle: 'New problem', editProblemTitle: 'Edit problem', title: 'Title', titlePlaceholder: 'Give the problem a clear title', tags: 'Tags', tagsPlaceholder: 'Separate with commas, e.g. DP, Graphs', statementLabel: 'Statement (Markdown)',
  newSolutionTitle: 'New solution', editSolutionTitle: 'Edit solution', solutionTitlePlaceholder: 'Summarize the core idea', contentLabel: 'Solution body (Markdown)', codeOptional: 'Code (optional)', languagePlaceholder: 'e.g. C++17', complexityPlaceholder: 'e.g. O(n log n)',
  newHackTitle: 'Propose a hack', hackTypePlaceholder: 'e.g. edge case, complexity, logic error', hackContentLabel: 'Explanation (Markdown)', hackHint: 'Provide a reproducible counterexample or a specific argument.',
  write: 'Write', preview: 'Preview', previewEmpty: 'Your preview will appear here', required: 'Please complete the required fields',
  email: 'Email', password: 'Password', username: 'Username', avatarUrl: 'Avatar URL', menu: 'Menu', pagination: 'Pagination', loading: 'Loading',
  loginTitle: 'Welcome back', registerTitle: 'Join OpenOI', loginHint: 'Log in to post, comment, and vote.', registerHint: 'Check your email to confirm your account.', noAccount: 'New here?', hasAccount: 'Already have an account?', checkEmail: 'Check your email and follow the confirmation link.', emailNotConfirmed: 'Email not confirmed. Check your inbox for the confirmation link.',
  profileTitle: 'Profile', profileEditTitle: 'Edit profile', memberSince: 'Joined', authoredProblems: 'Problems', authoredSolutions: 'Solutions', authoredHacks: 'Hacks',
  notFoundTitle: 'Page not found', notFoundText: 'This content may have been deleted, or the link is incorrect.', goHome: 'Back to home', errorTitle: 'Unable to load this page', retry: 'Try again',
  configTitle: 'Connect Supabase', configText: 'Set environment variables and initialize the database as described in the README to browse and post content.',
  noPermission: 'Only the author can edit or delete this content.', signInRequired: 'Please log in to continue.', back: 'Back', createdBy: 'By', updated: 'Updated',
  formFailed: 'Something went wrong. Please try again.', saving: 'Saving…', markdownHint: 'Markdown, code blocks, and math are supported.',
  externalUrl: 'Original problem URL', externalUrlPlaceholder: 'https://… (optional)', algorithm: 'Algorithm', algorithmPlaceholder: 'e.g. binary search', counterexample: 'Counterexample', logic: 'Logic error', complexity: 'Complexity issue', boundary: 'Boundary case', userNameHint: 'Lowercase letters, numbers, and underscores only', deleteConfirm: 'This cannot be undone',
  editHackTitle: 'Edit hack', footerTagline: 'Open algorithms, open discussion.', confirmError: 'This confirmation link is invalid or expired. Enter your email to request a new one.', resendConfirmation: 'Resend confirmation email', resendSent: 'If this account needs confirmation, we sent a new link.',
};

type Key = keyof typeof zh;
const Context = createContext<{ locale: Locale; t: (key: Key) => string; changeLocale: (locale: Locale) => Promise<void> }>({ locale: 'zh', t: (key) => zh[key], changeLocale: async () => {} });

export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const router = useRouter();
  const [locale, setCurrentLocale] = useState<Locale>(initialLocale);
  const changeLocale = async (next: Locale) => {
    if (next === locale) return;
    const data = new FormData(); data.set('locale', next);
    try { const result = await setLocale(data); if (result.ok) { setCurrentLocale(next); document.documentElement.lang = next; router.refresh(); } else window.alert(result.error); }
    catch { window.alert(locale === 'zh' ? zh.formFailed : en.formFailed); }
  };
  return <Context.Provider value={{ locale, t: (key) => (locale === 'zh' ? zh[key] : en[key]), changeLocale }}>{children}</Context.Provider>;
}

export const useI18n = () => useContext(Context);
export type TranslationKey = Key;
