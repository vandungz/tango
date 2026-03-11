function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function getBoardSizeFactor(size: number | null | undefined) {
    if (!Number.isFinite(size)) return 1;
    const safeSize = Number(size);
    if (safeSize >= 10) return 1.35;
    if (safeSize >= 8) return 1.18;
    return 1;
}

function getHardTierExtraFactor(size: number | null | undefined, label: string) {
    if (!Number.isFinite(size)) return 1;

    const safeSize = Number(size);
    const lowerLabel = label.toLowerCase();
    const isVeryHard = lowerLabel.includes('very hard');
    const isHard = isVeryHard || lowerLabel.includes('hard');

    if (!isHard) return 1;

    if (safeSize >= 10) {
        return isVeryHard ? 2.37 : 2.31;
    }

    if (safeSize >= 8) {
        return isVeryHard ? 2.32 : 2.28;
    }

    return 1;
}

function normalizeJourneyDifficulty(difficulty: number) {
    if (!Number.isFinite(difficulty)) return 0.5;
    return clamp((difficulty - 15) / 125, 0, 1);
}

function getLabelFactor(label: string) {
    const lower = label.toLowerCase();
    if (lower.includes('very hard')) return 0.42;
    if (lower.includes('hard')) return 0.7;
    if (lower.includes('medium')) return 0.82;
    return 0.9;
}

export function journeyStarThresholds(difficulty: number, label: string, boardSize?: number) {
    // Keep a single strict timeline for all Journey difficulties.
    // This matches the shortest profile previously used by Very Hard.
    const normalizedDifficulty = 1;
    const labelFactor = 0.42;
    const boardFactor = getBoardSizeFactor(boardSize);
    const hardTierExtraFactor = getHardTierExtraFactor(boardSize, label);
    const totalTimelineFactor = boardFactor * hardTierExtraFactor;

    const difficultyFactor = 1 - 0.35 * normalizedDifficulty;
    const threeStarBase = 170;
    const twoStarWindowBase = 90;
    const oneStarWindowBase = 105;

    const threeStar = clamp(Math.round(threeStarBase * labelFactor * difficultyFactor * totalTimelineFactor), 35, 320);

    const twoStarWindow = Math.max(35, Math.round(twoStarWindowBase * labelFactor * (1 - 0.15 * normalizedDifficulty) * totalTimelineFactor));
    const twoStar = threeStar + twoStarWindow;

    const oneStarWindow = Math.max(35, Math.round(oneStarWindowBase * labelFactor * (1 - 0.2 * normalizedDifficulty) * totalTimelineFactor));
    const maxTime = twoStar + oneStarWindow;

    return { threeStar, twoStar, maxTime };
}

export function journeyStarsFromTime(seconds: number | null | undefined, difficulty: number, label: string, boardSize?: number): number {
    if (!Number.isFinite(seconds) || seconds === null || seconds === undefined) return 0;

    const { threeStar, twoStar, maxTime } = journeyStarThresholds(difficulty, label, boardSize);

    if (seconds >= maxTime) return 0;
    if (seconds <= threeStar) return 3;
    if (seconds <= twoStar) return 2;
    return 1;
}
