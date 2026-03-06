import { prisma } from '@/lib/db';
import { generatePuzzle, GeneratedPuzzle } from '@/lib/engine/puzzle-factory';
import { BoardSize } from '@/lib/engine/types';

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

    if (!segment.sizes.includes(puzzle.size as BoardSize)) return Number.NEGATIVE_INFINITY;
    if (labelRank < minLabelRank || labelRank > maxLabelRank) return Number.NEGATIVE_INFINITY;
    if (puzzle.maxRuleDifficulty < segment.minRuleDifficulty || puzzle.maxRuleDifficulty > segment.maxRuleDifficulty) {
        return Number.NEGATIVE_INFINITY;
    }

    if (segment.requiredRules?.length) {
        const hasRequired = segment.requiredRules.some((rule) => puzzle.rulesUsed.includes(rule));
        if (!hasRequired) return Number.NEGATIVE_INFINITY;
    }

    const preferredMatches = segment.preferredRules.reduce((sum, rule) => sum + (puzzle.rulesUsed.includes(rule) ? 1 : 0), 0);
    const difficultyDistance = Math.abs(segment.targetDifficulty - puzzle.difficulty);

    return 200 - difficultyDistance + preferredMatches * 12 - Math.abs(segment.targetDifficulty - puzzle.maxRuleDifficulty * 12);
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

    for (let order = 1; order <= totalLevels; order++) {
        const segment = getSegmentForLevel(order, totalLevels);
        let best: LevelPlan | null = null;

        for (let attempt = 0; attempt < maxAttemptsPerLevel; attempt++) {
            const pickedSize = segment.sizes[(order + attempt) % segment.sizes.length];
            const candidate = generatePuzzle(pickedSize, { proMode: true, attempts: perPuzzleAttempts });

            if (usedHashes.has(candidate.hash)) continue;

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
            throw new Error(`Unable to curate puzzle for level ${order}. Increase generation attempts or relax segment constraints.`);
        }

        usedHashes.add(best.puzzle.hash);
        planned.push(best);
    }

    return planned;
}

function summarizePlans(levelPlans: LevelPlan[]) {
    const sizeDistribution = new Map<number, number>();
    const labelDistribution = new Map<string, number>();
    const ruleCoverage = new Set<string>();

    for (const plan of levelPlans) {
        sizeDistribution.set(plan.puzzle.size, (sizeDistribution.get(plan.puzzle.size) ?? 0) + 1);
        labelDistribution.set(plan.puzzle.label, (labelDistribution.get(plan.puzzle.label) ?? 0) + 1);
        for (const rule of plan.puzzle.rulesUsed) {
            ruleCoverage.add(rule);
        }
    }

    const missingRules = SPEC_RULES.filter((rule) => !ruleCoverage.has(rule));

    return {
        sizeDistribution: Object.fromEntries(sizeDistribution.entries()),
        labelDistribution: Object.fromEntries(labelDistribution.entries()),
        rulesCovered: Array.from(ruleCoverage).sort((a, b) => a.localeCompare(b)),
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

    const created = await db.$transaction(async (tx) => {
        if (oldSetIds.length > 0) {
            await tx.journeySet.updateMany({
                where: { id: { in: oldSetIds } },
                data: { isActive: false, archivedAt: now },
            });
        }

        const journeySet = await tx.journeySet.create({
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
            levelRows.push({ setId: journeySet.id, order: plan.order, puzzleId: storedPuzzle.id });
        }

        await tx.journeyLevel.createMany({ data: levelRows });

        if (options.purgePreviousSets && oldSetIds.length > 0) {
            if (options.resetPreviousProgress) {
                await tx.journeyResult.deleteMany({ where: { level: { setId: { in: oldSetIds } } } });
            }

            await tx.journeyLevel.deleteMany({ where: { setId: { in: oldSetIds } } });
            await tx.journeySet.deleteMany({ where: { id: { in: oldSetIds } } });
        }

        return journeySet;
    });

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
    const progressionDrops: number[] = [];

    let previousDifficulty: number | null = null;
    for (const level of levels) {
        sizeDistribution.set(level.puzzle.size, (sizeDistribution.get(level.puzzle.size) ?? 0) + 1);
        labelDistribution.set(level.puzzle.label, (labelDistribution.get(level.puzzle.label) ?? 0) + 1);

        const rules = parseRulesUsed(level.puzzle.rulesUsed);
        for (const rule of rules) {
            ruleCoverage.add(rule);
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
        missingRules,
        progressionDrops,
    };
}
