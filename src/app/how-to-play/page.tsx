import Link from 'next/link';
import styles from './page.module.css';

export default function HowToPlayPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>How to play</h1>
          <Link href="/" className={styles.closeBtn} aria-label="Close and go home">
            <span aria-hidden="true">×</span>
          </Link>
        </div>
        <ul className={styles.rules}>
          <li>Each row and column must have the same number of Suns and Moons.</li>
          <li>No more than two identical symbols can be next to each other.</li>
          <li>Cells connected by clues must follow their clue rule.</li>
          <li>Use logic only — every puzzle has a valid solution.</li>
        </ul>
      </section>
    </main>
  );
}
