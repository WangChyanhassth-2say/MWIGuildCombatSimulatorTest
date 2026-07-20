import solver from "javascript-lp-solver";

const IMPORTANCE_COVERAGE_DECAY = 0.5;

function roleScore(bossData, tag) {
    return Number(bossData.gain?.[tag] || 0);
}

function bestAuraStrengths(candidates, bossEntries) {
    const requiredAuras = [...new Set(bossEntries.flatMap(([, boss]) => boss.requiredAuras || []))];
    return Object.fromEntries(requiredAuras.map((aura) => [
        aura,
        Math.max(0, ...candidates.map((candidate) => Number(candidate.auraStrengths?.[aura] || 0))),
    ]));
}

function auraScore(strength, bestStrength) {
    if (Number(strength || 0) <= 0) return 0;
    const ratio = Number(bestStrength || 0) > 0 ? Number(strength || 0) / Number(bestStrength || 0) : 0;
    return ratio;
}

function addAllocationCoefficient(model, variableName, constraintName, value) {
    model.variables[variableName][constraintName] = (model.variables[variableName][constraintName] || 0) + value;
}

function allocationImportanceCoverageGroups(bossData) {
    const importance = bossData.importance || {};
    const coveredTags = new Set();
    const groups = [];
    for (const [groupIndex, group] of (bossData.survivalGroups || []).entries()) {
        const tags = (group.tags || []).filter(Boolean);
        const cap = Math.max(0, Math.floor(Number(group.min) || 0));
        const value = Math.max(0, ...tags.map((tag) => Number(importance[tag] || 0)));
        if (!tags.length || cap <= 0 || value <= 0) continue;
        tags.forEach((tag) => coveredTags.add(tag));
        groups.push({ id: `survival_${groupIndex}`, tags, cap, importance: value });
    }
    for (const [tag, value] of Object.entries(importance)) {
        const score = Number(value) || 0;
        if (!tag || score <= 0 || coveredTags.has(tag)) continue;
        groups.push({ id: `tag_${groups.length}`, tags: [tag], cap: 1, importance: score });
    }
    return groups;
}

function allocationMissingItems(candidates, bossEntries) {
    const missing = [];
    for (const [, bossData] of bossEntries) {
        for (const aura of bossData.requiredAuras || []) {
            if (!candidates.some((candidate) => Number(candidate.auraStrengths?.[aura] || 0) > 0)) {
                missing.push(`${bossData.label}:${aura}`);
            }
        }
        for (const group of bossData.survivalGroups || []) {
            const count = candidates.filter((candidate) => candidate.roleTags.some((tag) => group.tags.includes(tag))).length;
            if (count < Number(group.min || 0)) {
                missing.push(`${bossData.label}:${group.name} ${count}/${group.min}`);
            }
        }
    }
    return missing;
}

function buildAllocationModel({ candidates, bossEntries, rosterLimit, importanceDivisor, diminishingPenalty }) {
    const model = {
        optimize: "score",
        opType: "max",
        constraints: {},
        variables: {},
        binaries: {},
        options: { timeout: 20000 },
    };
    const metadata = {};
    const bossIds = bossEntries.map(([bossId]) => bossId);
    const [firstBossId, secondBossId] = bossIds;
    const bestStrengths = bestAuraStrengths(candidates, bossEntries);
    const divisor = Math.max(1, Number(importanceDivisor) || 1);
    const coverageGroupsByBoss = Object.fromEntries(bossEntries
        .map(([bossId, bossData]) => [bossId, allocationImportanceCoverageGroups(bossData)]));

    for (const candidate of candidates) {
        model.constraints[`player_${candidate.playerIndex}`] = { max: 1 };
        for (const [bossId, bossData] of bossEntries) {
            model.constraints[`playerBoss_${candidate.playerIndex}_${bossId}`] = { max: 1 };
            model.constraints[`playerAura_${candidate.playerIndex}_${bossId}`] = { max: 1 };
            for (const [auraIndex] of (bossData.requiredAuras || []).entries()) {
                model.constraints[`linkAura_${candidate.playerIndex}_${bossId}_${auraIndex}`] = { max: 0 };
            }
        }
    }

    for (const [bossId, bossData] of bossEntries) {
        model.constraints[`limit_${bossId}`] = { max: rosterLimit };
        for (const aura of bossData.requiredAuras || []) {
            model.constraints[`aura_${bossId}_${aura}`] = { equal: 1 };
        }
        for (const [groupIndex, group] of (bossData.survivalGroups || []).entries()) {
            model.constraints[`survival_${bossId}_${groupIndex}`] = { min: Number(group.min) || 0 };
        }
        for (const [coverageIndex, group] of (coverageGroupsByBoss[bossId] || []).entries()) {
            for (let count = 1; count <= group.cap; count += 1) {
                const constraintName = `coverage_${bossId}_${coverageIndex}_${count}`;
                const variableName = `cover_${bossId}_${coverageIndex}_${count}`;
                model.constraints[constraintName] = { min: 0 };
                model.variables[variableName] = {
                    score: (group.importance / divisor) * Math.pow(IMPORTANCE_COVERAGE_DECAY, count - 1),
                    [constraintName]: -count,
                };
                model.binaries[variableName] = 1;
            }
        }
    }

    if (diminishingPenalty > 0 && firstBossId && secondBossId) {
        model.constraints.balanceFirstBoss = { max: 0 };
        model.constraints.balanceSecondBoss = { max: 0 };
        model.variables.balanceOverFirstBoss = { score: -diminishingPenalty, balanceFirstBoss: -1 };
        model.variables.balanceOverSecondBoss = { score: -diminishingPenalty, balanceSecondBoss: -1 };
    }

    for (const candidate of candidates) {
        for (const [bossId, bossData] of bossEntries) {
            for (const [tagIndex, tag] of candidate.roleTags.entries()) {
                const rawScore = roleScore(bossData, tag) + 0.01;
                const variableName = `x_${candidate.playerIndex}_${bossId}_${tagIndex}`;
                model.variables[variableName] = {
                    score: rawScore,
                    [`player_${candidate.playerIndex}`]: 1,
                    [`playerBoss_${candidate.playerIndex}_${bossId}`]: 1,
                    [`limit_${bossId}`]: 1,
                };
                if (diminishingPenalty > 0 && firstBossId && secondBossId) {
                    model.variables[variableName].balanceFirstBoss = bossId === firstBossId ? rawScore : -rawScore;
                    model.variables[variableName].balanceSecondBoss = bossId === firstBossId ? -rawScore : rawScore;
                }
                for (const [auraIndex] of (bossData.requiredAuras || []).entries()) {
                    model.variables[variableName][`linkAura_${candidate.playerIndex}_${bossId}_${auraIndex}`] = -1;
                }
                for (const [groupIndex, group] of (bossData.survivalGroups || []).entries()) {
                    if (group.tags.includes(tag)) {
                        model.variables[variableName][`survival_${bossId}_${groupIndex}`] = 1;
                    }
                }
                for (const [coverageIndex, group] of (coverageGroupsByBoss[bossId] || []).entries()) {
                    if (!group.tags.includes(tag)) continue;
                    for (let count = 1; count <= group.cap; count += 1) {
                        addAllocationCoefficient(model, variableName, `coverage_${bossId}_${coverageIndex}_${count}`, 1);
                    }
                }
                model.binaries[variableName] = 1;
                metadata[variableName] = { type: "role", candidate, bossId, bossData, tag, score: model.variables[variableName].score };
            }
            for (const aura of bossData.requiredAuras || []) {
                const level = Number(candidate.auraLevels?.[aura] || 0);
                const strength = Number(candidate.auraStrengths?.[aura] || 0);
                if (level <= 0 || strength <= 0) continue;
                const auraIndex = bossData.requiredAuras.indexOf(aura);
                const variableName = `a_${candidate.playerIndex}_${bossId}_${auraIndex}`;
                const score = auraScore(strength, bestStrengths[aura]);
                model.variables[variableName] = {
                    score,
                    [`aura_${bossId}_${aura}`]: 1,
                    [`playerAura_${candidate.playerIndex}_${bossId}`]: 1,
                    [`linkAura_${candidate.playerIndex}_${bossId}_${auraIndex}`]: 1,
                };
                model.binaries[variableName] = 1;
                metadata[variableName] = { type: "aura", candidate, bossId, bossData, aura, level, strength, score };
            }
        }
    }

    return { model, metadata };
}

function projectAllocationResult(solution, metadata, bossEntries, rosterLimit) {
    const byBoss = Object.fromEntries(bossEntries.map(([bossId, bossData]) => [bossId, {
        bossId,
        bossIndex: bossData.bossIndex,
        label: bossData.label,
        encounterHrid: bossData.encounterHrid,
        roles: [],
        auras: [],
    }]));
    const roleCandidates = [];
    const auraCandidates = [];
    for (const [variableName, data] of Object.entries(metadata)) {
        const value = Number(solution[variableName] || 0);
        if (value < 0.5) continue;
        if (data.type === "role") {
            roleCandidates.push({
                value,
                score: data.score,
                bossId: data.bossId,
                presetId: data.candidate.presetId,
                playerName: data.candidate.playerName,
                playerIndex: data.candidate.playerIndex,
                tag: data.tag,
            });
        } else {
            auraCandidates.push({
                value,
                score: data.score,
                bossId: data.bossId,
                presetId: data.candidate.presetId,
                playerName: data.candidate.playerName,
                playerIndex: data.candidate.playerIndex,
                aura: data.aura,
                level: data.level,
                strength: data.strength,
            });
        }
    }
    roleCandidates.sort((a, b) => b.value - a.value || b.score - a.score || a.playerName.localeCompare(b.playerName));
    const usedPlayers = new Set();
    for (const role of roleCandidates) {
        if (usedPlayers.has(role.playerIndex)) continue;
        if (byBoss[role.bossId].roles.length >= rosterLimit) continue;
        usedPlayers.add(role.playerIndex);
        byBoss[role.bossId].roles.push({
            presetId: role.presetId,
            playerName: role.playerName,
            tag: role.tag,
            score: role.score,
        });
    }
    for (const [bossId, bossData] of bossEntries) {
        const assignedIds = new Set(byBoss[bossId].roles.map((role) => role.presetId));
        for (const aura of bossData.requiredAuras || []) {
            const options = auraCandidates
                .filter((entry) => entry.bossId === bossId && entry.aura === aura && assignedIds.has(entry.presetId))
                .sort((a, b) => b.strength - a.strength || b.score - a.score);
            const chosen = options[0];
            if (!chosen) continue;
            byBoss[bossId].auras.push({
                presetId: chosen.presetId,
                playerName: chosen.playerName,
                aura: chosen.aura,
                level: chosen.level,
                strength: chosen.strength,
                score: chosen.score,
            });
        }
        byBoss[bossId].roles.sort((a, b) => b.score - a.score || a.playerName.localeCompare(b.playerName));
        byBoss[bossId].auras.sort((a, b) => a.aura.localeCompare(b.aura));
    }
    return byBoss;
}

function solveAllocation(payload) {
    const missing = allocationMissingItems(payload.candidates, payload.bossEntries);
    if (missing.length) {
        throw new Error(`缺少可行候选：${missing.join("，")}`);
    }
    self.postMessage({ type: "progress", messageKey: "allocationProgressSolving" });
    const { model, metadata } = buildAllocationModel(payload);
    const solution = solver.Solve(model);
    if (!solution.feasible) {
        throw new Error("没有找到满足约束的分配方案");
    }
    self.postMessage({ type: "progress", messageKey: "allocationProgressFinishing" });
    const bosses = projectAllocationResult(
        solution,
        metadata,
        payload.bossEntries,
        Number(payload.rosterLimit) || 0,
    );
    return { score: Number(solution.result || 0), bosses, solvedAt: Date.now() };
}

self.onmessage = (event) => {
    if (event.data?.type !== "solve_api_allocation") return;
    try {
        self.postMessage({ type: "progress", messageKey: "allocationProgressPreparing" });
        self.postMessage({ type: "result", result: solveAllocation(event.data.payload) });
    } catch (error) {
        self.postMessage({ type: "error", error: error instanceof Error ? error.message : String(error) });
    }
};
