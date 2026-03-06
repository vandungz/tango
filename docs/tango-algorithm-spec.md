# Tango Puzzle Algorithm & Design Spec

> Consolidated from 4 source documents you provided (Feb 2026), used as the reference for understanding the game and implementing the generator/solver in this project.

## 1) Design goals

Tango is a binary puzzle (Sun/Moon) with these requirements:
- Each puzzle has a **unique solution**.
- It can be solved with **pure logic** (no blind guessing required).
- Difficulty reflects the **type of reasoning rules** required, not only board size.

## 2) Core game rules

All board sizes (4×4, 6×6, 8×8, 10×10) use the same 4 rules:

1. **Balance rule**: each row/column contains exactly half Sun and half Moon.
2. **No triple rule**: no 3 identical symbols in a row/column consecutively.
3. **`=` clue**: two adjacent cells must be **the same**.
4. **`×` clue**: two adjacent cells must be **different**.

## 3) Board-size metrics

| Size | Cells | Symbols per line | Base row patterns | Typical solve time |
|---|---:|---:|---:|---|
| 4×4 | 16 | 2 + 2 | 3 | 30–90 sec |
| 6×6 | 36 | 3 + 3 | 5 | 2–5 min |
| 8×8 | 64 | 4 + 4 | 12 | 4–10 min |
| 10×10 | 100 | 5 + 5 | 25 | 8–20 min |

**Base row patterns** = the number of valid “base” row patterns before reflection and color inversion symmetry are counted.

## 4) Solver rule taxonomy

Order from easiest to hardest (with reference difficulty weights):

1. **Clue Propagation** (1)
   - If one side of `=` or `×` is known, the other side is immediately deduced.

2. **Almost Full** (1)
   - If a row/column already reached quota for one symbol, all remaining blanks are the opposite symbol.

3. **Triple Prevention** (1)
   - Pattern `A A _` or `_ A A` forces the blank to `not A`.

4. **Gap Fill / Sandwich** (2)
   - Pattern `A _ A` forces the middle cell to `not A`.

5. **Touching Pair** (4)
   - For an unfilled `=` pair (`? = ?`), if an adjacent external cell is filled, the pair can be forced by anti-triple constraints.

6. **Edge Pair / Big Gap** (6)
   - Strong edge rule on small/medium boards (especially 6×6, with expanded variants for 8×8).

7. **Equal-Gap** (7)
   - Edge pattern `? = ?` plus information at the far end of the line can force the `=` pair (especially useful on 6×6).

8. **Opposite Inference** (9)
   - For unfilled `×` pairs in near-full lines, remaining quotas can force other cells.

9. **Inverse Big Gap** (9)
   - A rarer edge-pattern variant.

10. **Constraint Enumeration** (10)
   - Enumerate valid combinations for overlapping clue groups; cells that are invariant across all valid combinations are fixed.

## 5) Practical solving strategy (player-facing)

From the 3 strategy documents:
- Always scan `=` and `×` clues first.
- Count before placing.
- Find adjacent pairs and sandwich patterns (`A _ A`).
- Prioritize clue chains (many connected clues).
- Alternate row and column scans.
- When stuck, use validated contradiction (`what-if`).
- Prioritize easiest lines (fewest blanks), then iterate multiple passes.

## 6) Technical map by board size

### 4×4 (warm-up)
- Small solution space, fast cascades.
- Mainly clue propagation + counting.
- Advanced rules are rarely needed.

### 6×6 (sweet spot)
- Standard size with clear reasoning chains.
- Triple + Gap/Sandwich are required at medium level.
- Edge pattern and Equal-Gap often appear at hard level.

### 8×8 (challenge)
- Ambiguity increases significantly (12 base patterns).
- Counting rules trigger later than in 6×6.
- Requires clue chains + edge pattern recognition (8×8 Big Gap) + opposite inference.

### 10×10 (expert)
- Small-board edge rules are less forcing than in 6×6.
- Emphasizes systematic scanning, clue chains, and multi-pass counting.
- Constraint enumeration may be needed at very hard level.

## 7) Standard puzzle generation pipeline (4 steps)

## Step 1 — Build complete solution

Generate a fully solved board first:
1. Build valid row pattern set for the size:
   - Balanced symbols.
   - No triples.
2. Use base patterns + variants (reflection + inversion).
3. Place rows with backtracking:
   - No column count overflow.
   - No column triples.
   - No duplicate completed row/column (if line uniqueness is required by the game).
4. Output the **answer key**.

## Step 2 — Place `=` / `×` clues

- Collect adjacent cell pairs (horizontal/vertical).
- Randomly select by target clue density per size.
- If two solution cells are equal -> `=`; otherwise -> `×`.
- Clues are always truthful because they are derived from the known solution.

## Step 3 — Unsolve (remove cells)

Goal: maximize blanks while preserving logic solvability + uniqueness.

Process:
1. Pick a filled cell.
2. Temporarily remove it.
3. Run rule-based solver + unique-solution check.
4. If still deducible to the same unique solution -> keep blank.
5. Otherwise -> restore the cell.
6. Repeat until no further removals are possible.

## Step 4 — Score difficulty

- Run solver one final time from puzzle state.
- Record:
  - step list,
  - rules used,
  - max rule difficulty,
  - total difficulty score.
- Assign label:
  - Easy: only basic rules.
  - Medium: requires intermediate rules (triple/gap/touching/chains).
  - Hard: requires edge/equal-gap/opposite.
  - Very Hard: includes constraint enumeration.

## 8) Puzzle fairness

A puzzle is considered “fair” only if all are true:
- It has a solution.
- The solution is unique.
- It can be solved from initial state using the published engine logic rules.

No blind guessing is required; if contradiction is used, it must be a validated logical technique.

## 9) Recommended metadata per puzzle

Store metadata to improve auditability and difficulty scoring:
- `size`, `hash`, `board`, `solution`, `clues`
- `difficulty` (total score)
- `maxRuleDifficulty` (highest rule depth)
- `rulesUsed` (JSON rule array)
- `clueCount`, `givensCount`
- `baseRowPatternCount`
- `generationVersion`, `solverVersion`
- `label`

## 10) Reference pseudocode

```text
function generatePuzzle(size):
  solution = generateCompleteSolution(size)
  clues = placeCluesFromSolution(solution, size)
  puzzleBoard = unsolveMax(solution, clues, size)

  solveReport = solveRuleBased(puzzleBoard, clues, size)
  assert solveReport.solved
  assert solveReport.solution == solution
  assert countSolutions(puzzleBoard, clues) == 1

  difficulty = solveReport.totalDifficulty
  label = mapDifficulty(difficulty, solveReport.maxRuleDifficulty)

  return {
    board: puzzleBoard,
    solution,
    clues,
    difficulty,
    maxRuleDifficulty: solveReport.maxRuleDifficulty,
    rulesUsed: solveReport.rulesUsed,
    label
  }
```

## 11) How to use this spec in the project

- Use this document as the review baseline when modifying `generator`, `clue-placer`, `unsolver`, and `solver`.
- Any new rule must:
  1) clearly describe its pattern,
  2) define difficulty,
  3) include positive/negative test examples,
  4) update difficulty mapping.
- When tuning difficulty, prioritize adjustments to:
  - clue density per size,
  - unsolve strategy,
  - label thresholds using `maxRuleDifficulty` + total score.

## 12) Mode standards: Daily and Journey

### 12.1 Daily mode (one puzzle per day)

Product goals:
- Create daily return loops, with streak and time comparison.
- Same day + same variant must return the same puzzle for all players.

Technical standards:
- Daily puzzle identity key: `(date UTC, size, proMode)`.
- `date` must be normalized to **startOfDay UTC** to avoid timezone drift.
- Each Daily key maps to exactly one `puzzleId`.
- Daily puzzles must satisfy global fairness standards: logic-solvable + unique solution.

Gameplay standards:
- Support all 4 sizes: `4, 6, 8, 10`.
- `proMode` is the same-day variant, preferring higher difficulty among multiple internal generation attempts.
- Completion is stored by identity (`userId` or `sessionId`):
  - completion time,
  - stars,
  - completedAt.

Progression standards:
- Streaks are calculated by consecutive UTC days.
- `currentStreak`: number of consecutive days counting back from today.
- `bestStreak`: longest streak in history.
- If a player completes multiple sizes in one day:
  - store progress per variant,
  - when displaying summary, use the best result by higher stars, then lower time if tied.

### 12.2 Journey mode (progressive level sequence)

Product goals:
- Build a learning path from easy to hard so players internalize each rule.
- Provide long-term progression beyond daily loops.

Content standards:
- Finite level set (per docs: 200+ curated levels).
- Each level maps to a fixed puzzle (`level order -> puzzleId`).
- Level order must reflect learning curve:
  1) basic rules,
  2) intermediate rules,
  3) edge/inference,
  4) enumeration in final groups.

Implementation standards:
- Levels can come from the same generator pipeline, but require **curation/validation** before publishing.
- Avoid consecutive levels with overly similar reasoning profiles (rule-mix diversity).
- Recommended metadata for progression quality control:
  - `rulesUsed`, `maxRuleDifficulty`, `difficulty`, `size`, `clueCount`, `givensCount`.

Progress storage standards:
- One best result per identity per level.
- `bestTime = min(timeSeconds)` (valid runs only).
- `bestStars = max(stars)` across clears.
- `nextLevel` is the smallest unfinished level index.

### 12.3 Standard differences: Daily vs Journey

| Aspect | Daily | Journey |
|---|---|---|
| Puzzle source | Generated by day (deterministic by key) | Curated/fixed level list |
| Objective | Short-term retention, streak | Long-term skill development, mastery |
| Content reset | Daily | No reset, linear progression |
| Primary tracking | streak, best daily time | stars/timing per level |
| Balancing requirement | Fairness parity for everyone each day | Increasing difficulty, avoid harsh difficulty spikes |

---

**Version**: 1.1  
**Updated**: 2026-03-06  
**Scope**: Consolidated gameplay understanding + generation/solver algorithm from 4 provided source documents.