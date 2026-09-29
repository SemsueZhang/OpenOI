'use client';

import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUpRight, Braces, Plus } from 'lucide-react';
import type { Paged, Problem, ProblemFilters } from '@/lib/types';
import { useI18n } from '@/components/i18n';
import { ProblemCard, EmptyState, ConfigNotice } from '@/components/content';
import { ProblemFiltersForm, Pagination } from '@/components/problem-filters';
import { ParticleField } from '@/components/particle-field';

export function HomeView({ result, filters, configured, signedIn }: { result: Paged<Problem>; filters: ProblemFilters; configured: boolean; signedIn: boolean }) {
  const { t } = useI18n();
  return <div className="home-page">
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-hero-grid" aria-hidden="true" />
      <ParticleField />
      <div className="home-hero-glow" aria-hidden="true" />
      <div className="home-hero-content">
        <div className="home-hero-copy">
          <h1 id="home-title" className="home-title">{t('heroTitleFirst')}<br/><span>{t('heroTitleSecond')}</span></h1>
          <p className="home-lead">{t('heroDescription')}</p>
          <div className="home-hero-actions">
            <a href="#problems" className="home-primary-action">{t('heroExplore')}<ArrowRight size={17} strokeWidth={2} /></a>
            {signedIn && <Link href="/new/problem" className="home-secondary-action"><Plus size={17} strokeWidth={2}/>{t('newProblem')}</Link>}
          </div>
        </div>
        <div className="home-orbit" aria-hidden="true">
          <div className="home-orbit-ring home-orbit-ring-outer" />
          <div className="home-orbit-ring home-orbit-ring-inner" />
          <div className="home-orbit-cross home-orbit-cross-h" /><div className="home-orbit-cross home-orbit-cross-v" />
          <div className="home-orbit-core"><Braces size={46} strokeWidth={1.25} /></div>
          <div className="home-orbit-node home-orbit-node-one"><span className="home-node-number">01</span><span>{t('heroStepProblem')}</span></div>
          <div className="home-orbit-node home-orbit-node-two"><span className="home-node-number">02</span><span>{t('heroStepSolution')}</span></div>
          <div className="home-orbit-node home-orbit-node-three"><span className="home-node-number">03</span><span>{t('heroStepEvidence')}</span></div>
          <span className="home-orbit-dot home-orbit-dot-a" /><span className="home-orbit-dot home-orbit-dot-b" /><span className="home-orbit-dot home-orbit-dot-c" />
        </div>
      </div>
      <a href="#problems" className="home-scroll-cue"><ArrowDown size={15}/>{t('heroScroll')}</a>
    </section>

    <section id="problems" className="home-problems" aria-labelledby="problems-title">
      <div className="home-section-heading">
        <div><p className="home-section-kicker"><span>01 /</span> {t('heroDirectory')}</p><h2 id="problems-title">{t('explore')}</h2><p>{t('homeSub')}</p></div>
        {signedIn && <Link href="/new/problem" className="home-post-link">{t('newProblem')}<ArrowUpRight size={16}/></Link>}
      </div>
      {!configured ? <ConfigNotice/> : <div className="home-list-area"><ProblemFiltersForm filters={filters}/><div className="home-problem-list">{result.items.length ? result.items.map(problem => <ProblemCard key={problem.id} problem={problem}/>) : <EmptyState title={t('emptyProblems')} hint={t('emptyProblemsHint')}/>}</div><Pagination filters={filters} page={result.page} pages={result.pages}/></div>}
    </section>
  </div>;
}
