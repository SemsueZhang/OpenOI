'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/lib/types';
import { setLocale } from '@/app/actions';

const zh = {
  brand: 'OpenOI', problems: '题目', explore: '探索题目', newProblem: '发布题目', newSolution: '发布做法',
  login: '登录', register: '注册', logout: '退出登录', profile: '个人主页', settings: '编辑资料', language: '语言',
  homeTitle: '一起把算法讲清楚', homeSub: '发现题目、分享思路，交流不同做法。',
  heroTitleFirst: '算法竞赛中的', heroTitleSecond: '开放问题', heroDescription: '从一道题出发，汇集做法链接，分享简短思路。', heroExplore: '探索', heroStepProblem: '问题', heroStepSolution: '算法', heroStepEvidence: '证明', heroScroll: '向下探索', heroDirectory: '题目目录',
  search: '搜索标题', searchPlaceholder: '搜索题目标题…', all: '全部', tag: '标签', tagPlaceholder: '输入标签', filter: '筛选', reset: '清除筛选', solutions: '做法', solution: '做法', comments: '评论',
  emptyProblems: '还没有符合条件的题目', emptyProblemsHint: '试试调整筛选条件，或发布第一道题。', emptySolutions: '暂无做法', emptySolutionsHint: '分享你的做法，帮助其他人。', emptyComments: '暂无评论',
  previous: '上一页', next: '下一页', page: '页', of: '共', readProblem: '查看题目', statement: '题目描述', writeSolution: '写做法', relatedSolutions: '做法', sourceUrls: '来源链接', similarUrls: '相似题链接', originalUrl: '原文链接', urlListHint: '每行一个 HTTP 或 HTTPS 链接', authorReply: '做法作者',
  writeComment: '发表评论', commentPlaceholder: '最多 100 字，补充讨论或回应…', reply: '回应', edit: '编辑', delete: '删除', cancel: '取消', save: '保存', submit: '提交', submitting: '提交中…',
  confirmDeleteProblem: '删除题目会同时删除其做法和评论。确定继续？', confirmDeleteSolution: '删除做法会同时删除其评论。确定继续？', confirmDeleteComment: '确定删除这条评论？',
  newProblemTitle: '发布题目', editProblemTitle: '编辑题目', title: '标题', titlePlaceholder: '为题目取一个清晰的标题', tags: '标签', statementLabel: '题面（Markdown）',
  newSolutionTitle: '发布做法', editSolutionTitle: '编辑做法', solutionTitlePlaceholder: '概括你的核心思路', contentLabel: '做法摘要（Markdown，最多 1000 字）', summary: '摘要',
  write: '编辑', preview: '预览', previewEmpty: '预览会显示在这里', required: '请填写必填项', characterLimitExceeded: '内容超过字数上限。',
  email: '邮箱', password: '密码', username: '用户名', avatarUrl: '头像 URL', menu: '菜单', pagination: '分页', loading: '正在加载',
  loginTitle: '欢迎回来', registerTitle: '加入 OpenOI', loginHint: '登录后可以发布题目、做法并参与讨论。', registerHint: '注册后请查收确认邮件。', noAccount: '还没有账号？', hasAccount: '已有账号？', checkEmail: '请查收邮箱并点击确认链接。', emailNotConfirmed: '邮箱尚未验证，请查收确认邮件。',
  profileTitle: '个人资料', profileEditTitle: '编辑资料', memberSince: '加入于', authoredProblems: '发布的题目', authoredSolutions: '发布的做法',
  notFoundTitle: '找不到这个页面', notFoundText: '内容可能已删除，或链接有误。', goHome: '返回首页', errorTitle: '页面暂时无法加载', retry: '重试',
  configTitle: '需要连接 Supabase', configText: '请按 README 配置环境变量并初始化数据库，之后即可浏览和发布内容。',
  noPermission: '只有作者可以编辑或删除此内容。', signInRequired: '请先登录以继续。', back: '返回', createdBy: '作者', updated: '更新于',
  formFailed: '操作失败，请稍后重试。', saving: '保存中…', markdownHint: '支持 Markdown、代码块。公式可用 $...$、$$...$$、\\(...\\) 或 \\[...\\]。', userNameHint: '仅小写字母、数字、下划线', deleteConfirm: '删除后无法恢复', footerTagline: '开放的算法，开放的讨论。', confirmError: '确认链接无效或已过期。输入邮箱后可重发确认邮件。', resendConfirmation: '重发确认邮件', resendSent: '如果该邮箱需要确认，我们已发送新的确认链接。',
} as const;

const en: Record<keyof typeof zh, string> = {
  brand: 'OpenOI', problems: 'Problems', explore: 'Explore problems', newProblem: 'New problem', newSolution: 'New approach',
  login: 'Log in', register: 'Sign up', logout: 'Log out', profile: 'Profile', settings: 'Edit profile', language: 'Language',
  homeTitle: 'Make algorithms easier to understand', homeSub: 'Explore problems and share approaches.',
  heroTitleFirst: 'Open problems in ', heroTitleSecond: 'competitive programming', heroDescription: 'Start with a problem, share a short approach, and link to the original write-up.', heroExplore: 'Explore', heroStepProblem: 'Problem', heroStepSolution: 'Algorithm', heroStepEvidence: 'Proof', heroScroll: 'Explore below', heroDirectory: 'Problem directory',
  search: 'Search titles', searchPlaceholder: 'Search problem titles…', all: 'All', tag: 'Tag', tagPlaceholder: 'Enter a tag', filter: 'Apply', reset: 'Clear filters', solutions: 'Approaches', solution: 'Approach', comments: 'Comments',
  emptyProblems: 'No matching problems', emptyProblemsHint: 'Adjust your filters or post the first problem.', emptySolutions: 'No approaches yet', emptySolutionsHint: 'Share your approach to help others.', emptyComments: 'No comments yet',
  previous: 'Previous', next: 'Next', page: 'Page', of: 'of', readProblem: 'View problem', statement: 'Problem statement', writeSolution: 'Write an approach', relatedSolutions: 'Approaches', sourceUrls: 'Source links', similarUrls: 'Similar problem links', originalUrl: 'Original write-up', urlListHint: 'One HTTP or HTTPS URL per line', authorReply: 'Approach author',
  writeComment: 'Post comment', commentPlaceholder: 'Add a comment or response (100 characters max)…', reply: 'Reply', edit: 'Edit', delete: 'Delete', cancel: 'Cancel', save: 'Save', submit: 'Submit', submitting: 'Submitting…',
  confirmDeleteProblem: 'Deleting this problem also deletes its approaches and comments. Continue?', confirmDeleteSolution: 'Deleting this approach also deletes its comments. Continue?', confirmDeleteComment: 'Delete this comment?',
  newProblemTitle: 'New problem', editProblemTitle: 'Edit problem', title: 'Title', titlePlaceholder: 'Give the problem a clear title', tags: 'Tags', statementLabel: 'Statement (Markdown)',
  newSolutionTitle: 'New approach', editSolutionTitle: 'Edit approach', solutionTitlePlaceholder: 'Summarize the core idea', contentLabel: 'Approach summary (Markdown, 1,000 characters max)', summary: 'Summary',
  write: 'Write', preview: 'Preview', previewEmpty: 'Your preview will appear here', required: 'Please complete the required fields', characterLimitExceeded: 'This text exceeds the character limit.',
  email: 'Email', password: 'Password', username: 'Username', avatarUrl: 'Avatar URL', menu: 'Menu', pagination: 'Pagination', loading: 'Loading',
  loginTitle: 'Welcome back', registerTitle: 'Join OpenOI', loginHint: 'Log in to post problems, approaches, and comments.', registerHint: 'Check your email to confirm your account.', noAccount: 'New here?', hasAccount: 'Already have an account?', checkEmail: 'Check your email and follow the confirmation link.', emailNotConfirmed: 'Email not confirmed. Check your inbox for the confirmation link.',
  profileTitle: 'Profile', profileEditTitle: 'Edit profile', memberSince: 'Joined', authoredProblems: 'Problems', authoredSolutions: 'Approaches',
  notFoundTitle: 'Page not found', notFoundText: 'This content may have been deleted, or the link is incorrect.', goHome: 'Back to home', errorTitle: 'Unable to load this page', retry: 'Try again',
  configTitle: 'Connect Supabase', configText: 'Set environment variables and initialize the database as described in the README to browse and post content.',
  noPermission: 'Only the author can edit or delete this content.', signInRequired: 'Please log in to continue.', back: 'Back', createdBy: 'By', updated: 'Updated',
  formFailed: 'Something went wrong. Please try again.', saving: 'Saving…', markdownHint: 'Markdown and code blocks supported. Use $...$, $$...$$, \\(...\\), or \\[...\\] for math.', userNameHint: 'Lowercase letters, numbers, and underscores only', deleteConfirm: 'This cannot be undone', footerTagline: 'Open algorithms, open discussion.', confirmError: 'This confirmation link is invalid or expired. Enter your email to request a new one.', resendConfirmation: 'Resend confirmation email', resendSent: 'If this account needs confirmation, we sent a new link.',
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
