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

function allocationCandidateIdentity(candidate) {
    return {
        presetId: candidate.presetId ?? candidate.preset?.id,
        playerName: candidate.playerName ?? candidate.preset?.name,
        playerIndex: candidate.playerIndex,
    };
}

function survivalSatisfied(bossData, roles) {
    return (bossData.survivalGroups || []).every((group) => {
        const count = roles.filter((role) => group.tags.includes(role.tag)).length;
        return count >= (Number(group.min) || 0);
    });
}

function aurasSatisfied(bossId, bossData, roles, auraOptions) {
    const assignedIds = new Set(roles.map((role) => role.presetId));
    return (bossData.requiredAuras || []).every((aura) => auraOptions.some((entry) =>
        entry.bossId === bossId
        && entry.aura === aura
        && assignedIds.has(entry.presetId)
        && Number(entry.strength || 0) > 0));
}

function assignmentFeasible(byBoss, bossEntries, auraOptions) {
    return bossEntries.every(([bossId, bossData]) =>
        survivalSatisfied(bossData, byBoss[bossId].roles)
        && aurasSatisfied(bossId, bossData, byBoss[bossId].roles, auraOptions));
}

function finalizeBossAuras(byBoss, bossEntries, auraOptions) {
    for (const [bossId, bossData] of bossEntries) {
        const assignedIds = new Set(byBoss[bossId].roles.map((role) => role.presetId));
        byBoss[bossId].auras = [];
        for (const aura of bossData.requiredAuras || []) {
            const chosen = auraOptions
                .filter((entry) => entry.bossId === bossId && entry.aura === aura && assignedIds.has(entry.presetId))
                .sort((a, b) => b.strength - a.strength || b.score - a.score)[0];
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
}

function bestRoleOption(optionsByPlayerBoss, playerIndex, bossId) {
    return (optionsByPlayerBoss.get(`${playerIndex}::${bossId}`) || [])[0] || null;
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
    const bossIds = bossEntries.map(([bossId]) => bossId);
    const bossDataById = Object.fromEntries(bossEntries);
    const preferredRoles = [];
    const auraOptions = [];
    const optionsByPlayerBoss = new Map();
    const playerInfo = new Map();

    for (const [variableName, data] of Object.entries(metadata)) {
        const value = Number(solution[variableName] || 0);
        const identity = allocationCandidateIdentity(data.candidate);
        if (data.type === "role") {
            const option = {
                value,
                score: data.score,
                bossId: data.bossId,
                presetId: identity.presetId,
                playerName: identity.playerName,
                playerIndex: identity.playerIndex,
                tag: data.tag,
            };
            playerInfo.set(identity.playerIndex, identity);
            const key = `${identity.playerIndex}::${data.bossId}`;
            const list = optionsByPlayerBoss.get(key) || [];
            list.push(option);
            optionsByPlayerBoss.set(key, list);
            if (value >= 0.5) preferredRoles.push(option);
        } else {
            auraOptions.push({
                value,
                score: data.score,
                bossId: data.bossId,
                presetId: identity.presetId,
                playerName: identity.playerName,
                playerIndex: identity.playerIndex,
                aura: data.aura,
                level: data.level,
                strength: data.strength,
            });
        }
    }
    for (const list of optionsByPlayerBoss.values()) {
        list.sort((a, b) => b.score - a.score || a.tag.localeCompare(b.tag));
    }

    preferredRoles.sort((a, b) => b.value - a.value || b.score - a.score || a.playerName.localeCompare(b.playerName));
    const usedPlayers = new Set();
    const overflowPlayers = [];
    for (const role of preferredRoles) {
        if (usedPlayers.has(role.playerIndex)) continue;
        if (byBoss[role.bossId].roles.length >= rosterLimit) {
            overflowPlayers.push(role.playerIndex);
            continue;
        }
        usedPlayers.add(role.playerIndex);
        byBoss[role.bossId].roles.push({
            presetId: role.presetId,
            playerName: role.playerName,
            tag: role.tag,
            score: role.score,
            playerIndex: role.playerIndex,
        });
    }

    const assignPlayerToBoss = (playerIndex, bossId) => {
        if (usedPlayers.has(playerIndex) || byBoss[bossId].roles.length >= rosterLimit) return false;
        const option = bestRoleOption(optionsByPlayerBoss, playerIndex, bossId);
        if (!option) return false;
        const nextRoles = [...byBoss[bossId].roles, {
            presetId: option.presetId,
            playerName: option.playerName,
            tag: option.tag,
            score: option.score,
            playerIndex,
        }];
        if (!survivalSatisfied(bossDataById[bossId], nextRoles)
            && survivalSatisfied(bossDataById[bossId], byBoss[bossId].roles)) {
            return false;
        }
        usedPlayers.add(playerIndex);
        byBoss[bossId].roles = nextRoles;
        return true;
    };

    const seatPlayers = (playerIndexes) => {
        const ordered = [...new Set(playerIndexes)].filter((playerIndex) => !usedPlayers.has(playerIndex));
        ordered.sort((a, b) => {
            const bestA = Math.max(0, ...bossIds.map((bossId) => bestRoleOption(optionsByPlayerBoss, a, bossId)?.score || 0));
            const bestB = Math.max(0, ...bossIds.map((bossId) => bestRoleOption(optionsByPlayerBoss, b, bossId)?.score || 0));
            return bestB - bestA;
        });
        for (const playerIndex of ordered) {
            const rankedBosses = bossIds
                .map((bossId) => ({ bossId, option: bestRoleOption(optionsByPlayerBoss, playerIndex, bossId) }))
                .filter((entry) => entry.option && byBoss[entry.bossId].roles.length < rosterLimit)
                .sort((a, b) => b.option.score - a.option.score);
            for (const entry of rankedBosses) {
                if (assignPlayerToBoss(playerIndex, entry.bossId)) break;
            }
        }
    };

    seatPlayers(overflowPlayers);
    seatPlayers([...playerInfo.keys()]);

    const improveOnce = () => {
        for (const bossId of bossIds) {
            for (let index = 0; index < byBoss[bossId].roles.length; index += 1) {
                const current = byBoss[bossId].roles[index];
                for (const playerIndex of playerInfo.keys()) {
                    if (usedPlayers.has(playerIndex)) continue;
                    const option = bestRoleOption(optionsByPlayerBoss, playerIndex, bossId);
                    if (!option || option.score <= current.score + 1e-9) continue;
                    const nextRoles = byBoss[bossId].roles.map((role, roleIndex) => (roleIndex === index ? {
                        presetId: option.presetId,
                        playerName: option.playerName,
                        tag: option.tag,
                        score: option.score,
                        playerIndex,
                    } : role));
                    if (!survivalSatisfied(bossDataById[bossId], nextRoles)) continue;
                    const snapshot = Object.fromEntries(bossIds.map((id) => [id, {
                        roles: id === bossId ? nextRoles : byBoss[id].roles,
                    }]));
                    if (!aurasSatisfied(bossId, bossDataById[bossId], nextRoles, auraOptions)
                        && aurasSatisfied(bossId, bossDataById[bossId], byBoss[bossId].roles, auraOptions)) continue;
                    if (!assignmentFeasible(snapshot, bossEntries, auraOptions)
                        && assignmentFeasible(byBoss, bossEntries, auraOptions)) continue;
                    usedPlayers.delete(current.playerIndex);
                    usedPlayers.add(playerIndex);
                    byBoss[bossId].roles = nextRoles;
                    return true;
                }
            }
        }

        if (bossIds.length < 2) return false;
        const [bossA, bossB] = bossIds;
        for (let i = 0; i < byBoss[bossA].roles.length; i += 1) {
            for (let j = 0; j < byBoss[bossB].roles.length; j += 1) {
                const roleA = byBoss[bossA].roles[i];
                const roleB = byBoss[bossB].roles[j];
                const optionAtoB = bestRoleOption(optionsByPlayerBoss, roleA.playerIndex, bossB);
                const optionBtoA = bestRoleOption(optionsByPlayerBoss, roleB.playerIndex, bossA);
                if (!optionAtoB || !optionBtoA) continue;
                const delta = (optionAtoB.score + optionBtoA.score) - (roleA.score + roleB.score);
                if (delta <= 1e-9) continue;
                const nextA = byBoss[bossA].roles.map((role, index) => (index === i ? {
                    presetId: optionBtoA.presetId,
                    playerName: optionBtoA.playerName,
                    tag: optionBtoA.tag,
                    score: optionBtoA.score,
                    playerIndex: roleB.playerIndex,
                } : role));
                const nextB = byBoss[bossB].roles.map((role, index) => (index === j ? {
                    presetId: optionAtoB.presetId,
                    playerName: optionAtoB.playerName,
                    tag: optionAtoB.tag,
                    score: optionAtoB.score,
                    playerIndex: roleA.playerIndex,
                } : role));
                if (!survivalSatisfied(bossDataById[bossA], nextA) || !survivalSatisfied(bossDataById[bossB], nextB)) continue;
                const snapshot = Object.fromEntries(bossIds.map((id) => [id, {
                    roles: id === bossA ? nextA : id === bossB ? nextB : byBoss[id].roles,
                }]));
                if (!assignmentFeasible(snapshot, bossEntries, auraOptions)
                    && assignmentFeasible(byBoss, bossEntries, auraOptions)) continue;
                byBoss[bossA].roles = nextA;
                byBoss[bossB].roles = nextB;
                return true;
            }
        }
        return false;
    };

    for (let step = 0; step < 200; step += 1) {
        if (!improveOnce()) break;
    }

    for (const boss of Object.values(byBoss)) {
        boss.roles = boss.roles.map(({ presetId, playerName, tag, score }) => ({
            presetId, playerName, tag, score,
        }));
    }
    finalizeBossAuras(byBoss, bossEntries, auraOptions);
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
