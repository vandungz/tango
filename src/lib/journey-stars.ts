function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
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

export function journeyStarThresholds(difficulty: number, label: string) {
    // Keep a single strict timeline for all Journey difficulties.
    // This matches the shortest profile previously used by Very Hard.
    const normalizedDifficulty = 1;
    const labelFactor = 0.42;

    const difficultyFactor = 1 - 0.35 * normalizedDifficulty;
    const threeStarBase = 170;
    const twoStarWindowBase = 90;
    const oneStarWindowBase = 105;

    const threeStar = clamp(Math.round(threeStarBase * labelFactor * difficultyFactor), 35, 220);

    const twoStarWindow = Math.max(35, Math.round(twoStarWindowBase * labelFactor * (1 - 0.15 * normalizedDifficulty)));
    const twoStar = threeStar + twoStarWindow;

    const oneStarWindow = Math.max(35, Math.round(oneStarWindowBase * labelFactor * (1 - 0.2 * normalizedDifficulty)));
    const maxTime = twoStar + oneStarWindow;

    return { threeStar, twoStar, maxTime };
}

export function journeyStarsFromTime(seconds: number | null | undefined, difficulty: number, label: string): number {
    if (!Number.isFinite(seconds) || seconds === null || seconds === undefined) return 0;

    const { threeStar, twoStar, maxTime } = journeyStarThresholds(difficulty, label);

    if (seconds >= maxTime) return 0;
    if (seconds <= threeStar) return 3;
    if (seconds <= twoStar) return 2;
    return 1;
}
