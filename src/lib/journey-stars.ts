function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

export function journeyStarThresholds(difficulty: number, label: string) {
    const normalized = clamp(Math.round(difficulty) || 1, 1, 5);
    const lower = label.toLowerCase();

    const labelFactor = lower.includes('very hard') ? 0.78 : lower.includes('hard') ? 0.88 : 1;
    const difficultyFactor = 1 - (normalized - 1) * 0.08;

    const threeStar = clamp(Math.round(150 * labelFactor * difficultyFactor), 75, 180);
    const twoStar = Math.round(threeStar + 80 * labelFactor);
    const maxTime = Math.round(twoStar + 90 * labelFactor);

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
