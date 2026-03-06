import { prisma } from '@/lib/db';
import { generatePuzzle, GeneratedPuzzle } from '@/engine/puzzle-factory';
import { BoardSize } from '@/engine/types';

type JourneyLabel = 'Easy' | 'Medium' | 'Hard' | 'Very Hard';

type JourneySegment = {
    minRatio: number;
    maxRatio: number;
    sizes: BoardSize[];
    minRuleDifficulty: number;
    maxRuleDifficulty: number;
    minLabel: JourneyLabel;
    maxLabel: JourneyLabel;
    targetDifficulty: number;
    preferredRules: string[];
    requiredRules?: string[];
};

type LevelPlan = {
    order: number;
    puzzle: GeneratedPuzzle;
    score: number;
};

export type JourneyRebuildOptions = {
    setKey?: string;
    setLabel?: string;
    description?: string;
    totalLevels?: number;
    dryRun?: boolean;
    force?: boolean;
    maxAttemptsPerLevel?: number;
    perPuzzleAttempts?: number;
    purgePreviousSets?: boolean;
    resetPreviousProgress?: boolean;
};

const db = prisma as unknown as {
    puzzle: typeof prisma.puzzle;
    journeySet: any;
    journeyLevel: any;
    journeyResult: any;
    $transaction: typeof prisma.$transaction;
};

const LABEL_RANK: Record<JourneyLabel, number> = {
    Easy: 1,
    Medium: 2,
    Hard: 3,
    'Very Hard': 4,
};

const SPEC_RULES = [
    'Clue Propagation',
    'Almost Full',
    'Triple Prevention',
    'Gap Fill',
    'Touching Pair',
    'Edge Pair / Big Gap',
    'Equal-Gap',
    'Opposite Inference',
    'Inverse Big Gap',
    'Constraint Enumeration',
];

const RULE_DIFFICULTY: Record<string, number> = {
    'Clue Propagation': 1,
    'Almost Full': 1,
    'Triple Prevention': 1,
    'Gap Fill': 2,
    'Touching Pair': 4,
    'Edge Pair / Big Gap': 6,
    'Equal-Gap': 7,
    'Opposite Inference': 9,
    'Inverse Big Gap': 9,
    'Constraint Enumeration': 10,
};

const JOURNEY_SEGMENTS: JourneySegment[] = [
    {
        minRatio: 0,
        maxRatio: 0.15,
        sizes: [4],
        minRuleDifficulty: 1,
        maxRuleDifficulty: 2,
        minLabel: 'Easy',
        maxLabel: 'Medium',
        targetDifficulty: 18,
        preferredRules: ['Clue Propagation', 'Almost Full', 'Triple Prevention', 'Gap Fill'],
    },
    {
        minRatio: 0.15,
        maxRatio: 0.45,
        sizes: [6],
        minRuleDifficulty: 2,
        maxRuleDifficulty: 6,
        minLabel: 'Medium',
        maxLabel: 'Hard',
        targetDifficulty: 42,
        preferredRules: ['Triple Prevention', 'Gap Fill', 'Touching Pair', 'Edge Pair / Big Gap'],
    },
    {
        minRatio: 0.45,
        maxRatio: 0.75,
        sizes: [6, 8],
        minRuleDifficulty: 4,
        maxRuleDifficulty: 9,
        minLabel: 'Hard',
        maxLabel: 'Hard',
        targetDifficulty: 78,
        preferredRules: ['Touching Pair', 'Edge Pair / Big Gap', 'Equal-Gap', 'Opposite Inference'],
    },
    {
        minRatio: 0.75,
        maxRatio: 0.95,
        sizes: [8, 10],
        minRuleDifficulty: 6,
        maxRuleDifficulty: 10,
        minLabel: 'Hard',
        maxLabel: 'Very Hard',
        targetDifficulty: 110,
        preferredRules: ['Edge Pair / Big Gap', 'Opposite Inference', 'Inverse Big Gap'],
        requiredRules: ['Opposite Inference'],
    },
    {
        minRatio: 0.95,
        maxRatio: 1,
        sizes: [10, 8],
        minRuleDifficulty: 9,
        maxRuleDifficulty: 10,
        minLabel: 'Very Hard',
        maxLabel: 'Very Hard',
        targetDifficulty: 140,
        preferredRules: ['Opposite Inference', 'Inverse Big Gap', 'Constraint Enumeration'],
        requiredRules: ['Opposite Inference'],
    },
];

function getSegmentForLevel(levelOrder: number, totalLevels: number): JourneySegment {
    const ratio = levelOrder / Math.max(1, totalLevels);
    return JOURNEY_SEGMENTS.find((segment) => ratio > segment.minRatio && ratio <= segment.maxRatio) ?? JOURNEY_SEGMENTS[JOURNEY_SEGMENTS.length - 1];
}

function parseRulesUsed(serialized: string | null | undefined): string[] {
    if (!serialized) return [];

    try {
        const parsed = JSON.parse(serialized);
        if (Array.isArray(parsed)) {
            return parsed.filter((value): value is string => typeof value === 'string');
        }
    } catch {
        return [];
    }

    return [];
}

function scorePuzzleForSegment(puzzle: GeneratedPuzzle, segment: JourneySegment): number {
    const labelRank = LABEL_RANK[puzzle.label as JourneyLabel];
    if (!labelRank) return Number.NEGATIVE_INFINITY;

    const minLabelRank = LABEL_RANK[segment.minLabel];
    const maxLabelRank = LABEL_RANK[segment.maxLabel];

    const sizePenalty = segment.sizes.includes(puzzle.size as BoardSize) ? 0 : 80;

    const labelDistance = labelRank < minLabelRank ? minLabelRank - labelRank : labelRank > maxLabelRank ? labelRank - maxLabelRank : 0;

    const ruleDifficultyDistance =
        puzzle.maxRuleDifficulty < segment.minRuleDifficulty
            ? segment.minRuleDifficulty - puzzle.maxRuleDifficulty
            : puzzle.maxRuleDifficulty > segment.maxRuleDifficulty
                ? puzzle.maxRuleDifficulty - segment.maxRuleDifficulty
                : 0;

    const missingRequiredCount = segment.requiredRules?.filter((rule) => !puzzle.rulesUsed.includes(rule)).length ?? 0;

    const preferredMatches = segment.preferredRules.reduce((sum, rule) => sum + (puzzle.rulesUsed.includes(rule) ? 1 : 0), 0);
    const difficultyDistance = Math.abs(segment.targetDifficulty - puzzle.difficulty);

    const penalty =
        sizePenalty +
        labelDistance * 25 +
        ruleDifficultyDistance * 18 +
        missingRequiredCount * 40;

    return 260 - difficultyDistance + preferredMatches * 12 - Math.abs(segment.targetDifficulty - puzzle.maxRuleDifficulty * 12) - penalty;
}

function includesAllRules(puzzle: GeneratedPuzzle, requiredRules?: string[]): boolean {
    if (!requiredRules || requiredRules.length === 0) return true;
    return requiredRules.every((rule) => puzzle.rulesUsed.includes(rule));
}

function getMinimumRuleCoverage(totalLevels: number): Record<string, number> {
    if (totalLevels >= 200) {
        return {
            'Opposite Inference': 4,
        };
    }

    if (totalLevels >= 120) {
        return {
            'Opposite Inference': 2,
        };
    }

    return {
        'Opposite Inference': 1,
    };
}

function countRemainingEligibleLevels(fromOrder: number, totalLevels: number, rule: string): number {
    const requiredDifficulty = RULE_DIFFICULTY[rule] ?? 10;
    let count = 0;

    for (let order = fromOrder; order <= totalLevels; order++) {
        const segment = getSegmentForLevel(order, totalLevels);
        const eligibleByRuleList = segment.preferredRules.includes(rule) || (segment.requiredRules?.includes(rule) ?? false);
        const eligibleByDifficulty = segment.maxRuleDifficulty >= requiredDifficulty;

        if (eligibleByRuleList || eligibleByDifficulty) {
            count += 1;
        }
    }

    return count;
}

async function storePuzzleIfNeeded(puzzle: GeneratedPuzzle) {
    const existing = await db.puzzle.findUnique({ where: { hash: puzzle.hash } });
    if (existing) return existing;

    return db.puzzle.create({
        data: {
            size: puzzle.size,
            hash: puzzle.hash,
            board: JSON.stringify(puzzle.board),
            solution: JSON.stringify(puzzle.solution),
            clues: JSON.stringify(puzzle.clues),
            difficulty: puzzle.difficulty,
            maxRuleDifficulty: puzzle.maxRuleDifficulty,
            rulesUsed: JSON.stringify(puzzle.rulesUsed),
            clueCount: puzzle.clueCount,
            givensCount: puzzle.givensCount,
            baseRowPatternCount: puzzle.baseRowPatternCount,
            generationVersion: puzzle.generationVersion,
            solverVersion: puzzle.solverVersion,
            label: puzzle.label,
        },
    });
}

async function planJourneyLevels(totalLevels: number, maxAttemptsPerLevel: number, perPuzzleAttempts: number): Promise<LevelPlan[]> {
    const planned: LevelPlan[] = [];
    const usedHashes = new Set<string>();
    const minimumCoverage = getMinimumRuleCoverage(totalLevels);
    const achievedCoverage = new Map<string, number>();

    for (let order = 1; order <= totalLevels; order++) {
        const segment = getSegmentForLevel(order, totalLevels);
        const mustIncludeRules = new Set<string>(segment.requiredRules ?? []);

        for (const [rule, minCount] of Object.entries(minimumCoverage)) {
            const currentCount = achievedCoverage.get(rule) ?? 0;
            const remainingNeeded = minCount - currentCount;
            if (remainingNeeded <= 0) continue;

            const remainingEligible = countRemainingEligibleLevels(order, totalLevels, rule);
            if (remainingEligible <= remainingNeeded) {
                mustIncludeRules.add(rule);
            }
        }

        let best: LevelPlan | null = null;
        const requiredForLevel = Array.from(mustIncludeRules);
        const strictAttempts = Math.max(maxAttemptsPerLevel, requiredForLevel.length > 0 ? maxAttemptsPerLevel * 3 : maxAttemptsPerLevel);

        for (let attempt = 0; attempt < strictAttempts; attempt++) {
            const pickedSize = segment.sizes[(order + attempt) % segment.sizes.length];
            const candidate = generatePuzzle(pickedSize, { proMode: true, attempts: perPuzzleAttempts });

            if (usedHashes.has(candidate.hash)) continue;
            if (!includesAllRules(candidate, requiredForLevel)) continue;

            const score = scorePuzzleForSegment(candidate, segment);
            if (!Number.isFinite(score)) continue;

            if (!best || score > best.score) {
                best = { order, puzzle: candidate, score };
            }

            if (score >= 190) {
                break;
            }
        }

        if (!best) {
            const suffix = requiredForLevel.length > 0 ? ` Required rules: ${requiredForLevel.join(', ')}` : '';
            throw new Error(`Unable to curate puzzle for level ${order}. Increase generation attempts or relax segment constraints.${suffix}`);
        }

        usedHashes.add(best.puzzle.hash);
        planned.push(best);

        for (const rule of best.puzzle.rulesUsed) {
            achievedCoverage.set(rule, (achievedCoverage.get(rule) ?? 0) + 1);
        }
    }

    for (const [rule, minCount] of Object.entries(minimumCoverage)) {
        const actual = achievedCoverage.get(rule) ?? 0;
        if (actual < minCount) {
            throw new Error(`Journey coverage requirement unmet for rule "${rule}": ${actual}/${minCount}`);
        }
    }

    return planned;
}

function summarizePlans(levelPlans: LevelPlan[]) {
    const sizeDistribution = new Map<number, number>();
    const labelDistribution = new Map<string, number>();
    const ruleCoverage = new Set<string>();
    const ruleUsage = new Map<string, number>();

    for (const plan of levelPlans) {
        sizeDistribution.set(plan.puzzle.size, (sizeDistribution.get(plan.puzzle.size) ?? 0) + 1);
        labelDistribution.set(plan.puzzle.label, (labelDistribution.get(plan.puzzle.label) ?? 0) + 1);
        for (const rule of plan.puzzle.rulesUsed) {
            ruleCoverage.add(rule);
            ruleUsage.set(rule, (ruleUsage.get(rule) ?? 0) + 1);
        }
    }

    const missingRules = SPEC_RULES.filter((rule) => !ruleCoverage.has(rule));

    return {
        sizeDistribution: Object.fromEntries(sizeDistribution.entries()),
        labelDistribution: Object.fromEntries(labelDistribution.entries()),
        rulesCovered: Array.from(ruleCoverage).sort((a, b) => a.localeCompare(b)),
        ruleUsage: Object.fromEntries(ruleUsage.entries()),
        missingRules,
    };
}

export async function getActiveJourneySet() {
    return db.journeySet.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            key: true,
            label: true,
            totalLevels: true,
            createdAt: true,
        },
    });
}

export async function rebuildJourneySet(options: JourneyRebuildOptions = {}) {
    const totalLevels = Math.max(1, Math.floor(options.totalLevels ?? 200));
    const maxAttemptsPerLevel = Math.max(8, Math.floor(options.maxAttemptsPerLevel ?? 30));
    const perPuzzleAttempts = Math.max(1, Math.floor(options.perPuzzleAttempts ?? 4));
    const dryRun = options.dryRun ?? true;
    const force = options.force ?? false;

    if (!dryRun && !force) {
        throw new Error('Refusing destructive Journey rebuild without force=true. Use dryRun=true to preview safely.');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const setKey = options.setKey?.trim() || `journey-${timestamp}`;
    const setLabel = options.setLabel?.trim() || `Journey ${new Date().toISOString().slice(0, 10)}`;

    const existingKey = await db.journeySet.findUnique({ where: { key: setKey }, select: { id: true } });
    if (existingKey) {
        throw new Error(`Journey set key already exists: ${setKey}`);
    }

    const activeSets = await db.journeySet.findMany({ where: { isActive: true }, select: { id: true, key: true } });
    const plans = await planJourneyLevels(totalLevels, maxAttemptsPerLevel, perPuzzleAttempts);
    const summary = summarizePlans(plans);

    if (dryRun) {
        return {
            dryRun: true,
            setKey,
            setLabel,
            totalLevels,
            activeSetKeys: activeSets.map((set: { key: string }) => set.key),
            ...summary,
        };
    }

    const now = new Date();
    const oldSetIds = activeSets.map((set: { id: string }) => set.id);

    if (oldSetIds.length > 0) {
        for (const oldSetId of oldSetIds) {
            await db.journeySet.update({
                where: { id: oldSetId },
                data: { isActive: false, archivedAt: now },
            });
        }
    }

    const created = await db.journeySet.create({
        data: {
            key: setKey,
            label: setLabel,
            description: options.description ?? 'Curated from algorithm-spec based level profiles',
            totalLevels,
            isActive: true,
        },
    });

    const levelRows = [] as Array<{ setId: string; order: number; puzzleId: string }>;

    for (const plan of plans) {
        const storedPuzzle = await storePuzzleIfNeeded(plan.puzzle);
        levelRows.push({ setId: created.id, order: plan.order, puzzleId: storedPuzzle.id });
    }

    for (const row of levelRows) {
        await db.journeyLevel.create({ data: row });
    }

    if (options.purgePreviousSets && oldSetIds.length > 0) {
        for (const oldSetId of oldSetIds) {
            const oldLevels = await db.journeyLevel.findMany({
                where: { setId: oldSetId },
                select: { id: true },
            });

            if (options.resetPreviousProgress) {
                for (const oldLevel of oldLevels) {
                    const oldResults = await db.journeyResult.findMany({
                        where: { levelId: oldLevel.id },
                        select: { id: true },
                    });

                    for (const oldResult of oldResults) {
                        await db.journeyResult.delete({ where: { id: oldResult.id } });
                    }
                }
            }

            for (const oldLevel of oldLevels) {
                await db.journeyLevel.delete({ where: { id: oldLevel.id } });
            }

            await db.journeySet.delete({ where: { id: oldSetId } });
        }
    }

    return {
        dryRun: false,
        setId: created.id,
        setKey,
        setLabel,
        totalLevels,
        replacedSetKeys: activeSets.map((set: { key: string }) => set.key),
        ...summary,
    };
}

export async function auditActiveJourneySet() {
    const activeSet = await db.journeySet.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        include: {
            levels: {
                include: {
                    puzzle: {
                        select: {
                            size: true,
                            label: true,
                            difficulty: true,
                            maxRuleDifficulty: true,
                            rulesUsed: true,
                        },
                    },
                },
                orderBy: { order: 'asc' },
            },
        },
    });

    if (!activeSet) {
        return {
            hasActiveSet: false,
            warning: 'No active Journey set found',
        };
    }

    const levels = activeSet.levels as Array<{
        order: number;
        puzzle: {
            size: number;
            label: string;
            difficulty: number;
            maxRuleDifficulty: number;
            rulesUsed: string;
        };
    }>;

    const sizeDistribution = new Map<number, number>();
    const labelDistribution = new Map<string, number>();
    const ruleCoverage = new Set<string>();
    const ruleUsage = new Map<string, number>();
    const progressionDrops: number[] = [];

    let previousDifficulty: number | null = null;
    for (const level of levels) {
        sizeDistribution.set(level.puzzle.size, (sizeDistribution.get(level.puzzle.size) ?? 0) + 1);
        labelDistribution.set(level.puzzle.label, (labelDistribution.get(level.puzzle.label) ?? 0) + 1);

        const rules = parseRulesUsed(level.puzzle.rulesUsed);
        for (const rule of rules) {
            ruleCoverage.add(rule);
            ruleUsage.set(rule, (ruleUsage.get(rule) ?? 0) + 1);
        }

        if (previousDifficulty !== null && level.puzzle.difficulty + 20 < previousDifficulty) {
            progressionDrops.push(level.order);
        }

        previousDifficulty = level.puzzle.difficulty;
    }

    const missingRules = SPEC_RULES.filter((rule) => !ruleCoverage.has(rule));

    return {
        hasActiveSet: true,
        set: {
            id: activeSet.id,
            key: activeSet.key,
            label: activeSet.label,
            totalLevels: activeSet.totalLevels,
            createdAt: activeSet.createdAt,
        },
        actualLevels: levels.length,
        sizeDistribution: Object.fromEntries(sizeDistribution.entries()),
        labelDistribution: Object.fromEntries(labelDistribution.entries()),
        rulesCovered: Array.from(ruleCoverage).sort((a, b) => a.localeCompare(b)),
        ruleUsage: Object.fromEntries(ruleUsage.entries()),
        missingRules,
        progressionDrops,
    };
}
