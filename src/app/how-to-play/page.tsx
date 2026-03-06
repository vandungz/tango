"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function HowToPlayPage() {
  const [showFloatingHeader, setShowFloatingHeader] = useState(false);
  const headerAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const anchor = headerAnchorRef.current;
    if (!anchor) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFloatingHeader(!entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0.01,
      }
    );

    observer.observe(anchor);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div
          className={`${styles.floatingHeader} ${showFloatingHeader ? styles.floatingHeaderVisible : ''}`}
          inert={!showFloatingHeader}
        >
          <div className={styles.floatingHeaderInner}>
            <h1 className={styles.floatingTitle}>How to play</h1>
            <Link href="/" className={styles.closeBtn} aria-label="Close and go home">
              <span aria-hidden="true">×</span>
            </Link>
          </div>
        </div>

        <section className={styles.card}>
          <div className={styles.content}>
            <div ref={headerAnchorRef} className={styles.header}>
              <h1 className={styles.title}>How to play</h1>
              <Link href="/" className={styles.closeBtn} aria-label="Close and go home">
                <span aria-hidden="true">×</span>
              </Link>
            </div>

            <p className={styles.lead}>
              Tango is a binary logic puzzle. Every level has exactly one solution and is designed to
              be solved by reasoning, not guessing.
            </p>

            <section id="core-rules" className={styles.section} aria-labelledby="core-rules-heading">
              <h2 id="core-rules-heading" className={styles.sectionTitle}>
                Core rules
              </h2>
              <ul className={styles.list}>
                <li>
                  <strong>Balance:</strong> each row and each column must contain exactly half Suns and
                  half Moons.
                </li>
                <li>
                  <strong>No triple:</strong> three identical symbols cannot appear consecutively in any
                  row or column.
                </li>
                <li>
                  <strong>= clue:</strong> the two linked cells must be the same symbol.
                </li>
                <li>
                  <strong>× clue:</strong> the two linked cells must be different symbols.
                </li>
              </ul>
            </section>

            <section id="solve-flow" className={styles.section} aria-labelledby="how-solve-heading">
              <h2 id="how-solve-heading" className={styles.sectionTitle}>
                How to solve efficiently
              </h2>
              <ul className={styles.list}>
                <li>Start with clue links (`=` and `×`) and propagate from already known cells.</li>
                <li>
                  Count symbols in each line. If one symbol already hits its quota, fill remaining cells
                  with the opposite symbol.
                </li>
                <li>
                  Watch common patterns: <code>A A _</code>, <code>_ A A</code>, and{' '}
                  <code>A _ A</code>.
                </li>
                <li>Alternate row and column scans to trigger deduction chains.</li>
                <li>
                  When stuck, test a short what-if branch and keep only conclusions that are logically
                  validated.
                </li>
              </ul>
            </section>

            <section id="difficulty" className={styles.section} aria-labelledby="difficulty-heading">
              <h2 id="difficulty-heading" className={styles.sectionTitle}>
                Difficulty and board sizes
              </h2>
              <p className={styles.text}>
                Difficulty is based on the reasoning depth required, not only board size. Larger boards
                generally need longer deduction chains and more advanced inference.
              </p>
              <div className={styles.grid}>
                <article className={styles.gridItem}>
                  <h3 className={styles.gridTitle}>4×4</h3>
                  <p className={styles.gridText}>Warm-up. Fast clue propagation and basic counting.</p>
                </article>
                <article className={styles.gridItem}>
                  <h3 className={styles.gridTitle}>6×6</h3>
                  <p className={styles.gridText}>
                    Core experience. Triple prevention and gap logic become important.
                  </p>
                </article>
                <article className={styles.gridItem}>
                  <h3 className={styles.gridTitle}>8×8</h3>
                  <p className={styles.gridText}>
                    More ambiguity. Requires stronger clue chains and edge inferences.
                  </p>
                </article>
                <article className={styles.gridItem}>
                  <h3 className={styles.gridTitle}>10×10</h3>
                  <p className={styles.gridText}>
                    Expert mode. Systematic multi-pass scanning and advanced constraints.
                  </p>
                </article>
              </div>
            </section>

            <section id="modes" className={styles.section} aria-labelledby="modes-heading">
              <h2 id="modes-heading" className={styles.sectionTitle}>
                Game modes
              </h2>
              <div className={styles.modeGrid}>
                <article className={styles.modeCard}>
                  <h3 className={styles.modeTitle}>Daily</h3>
                  <p className={styles.modeText}>
                    One shared puzzle per day for each size and mode variant. Daily play powers streaks,
                    best time comparisons, and quick return sessions.
                  </p>
                </article>
                <article className={styles.modeCard}>
                  <h3 className={styles.modeTitle}>Journey</h3>
                  <p className={styles.modeText}>
                    A fixed progression of curated levels from easy to expert. This mode is built to
                    teach rules step by step and reward long-term mastery.
                  </p>
                </article>
              </div>
            </section>

            <p className={styles.footnote}>
              Fair-play standard: every published puzzle is solvable, has one unique answer, and can
              be completed through logic.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
