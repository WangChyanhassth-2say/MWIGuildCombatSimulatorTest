import Ability from "./combatsimulator/ability";
import Achievement from "./combatsimulator/achievement";
import CombatSimulator from "./combatsimulator/combatSimulator";
import Equipment from "./combatsimulator/equipment";
import GuildTrial from "./combatsimulator/guildTrial";
import HouseRoom from "./combatsimulator/houseRoom";
import Player from "./combatsimulator/player";
import Trigger from "./combatsimulator/trigger";

const EQUIPMENT_TYPES = [
    "head", "body", "legs", "feet", "hands", "off_hand", "pouch",
    "neck", "earrings", "ring", "back", "main_hand", "two_hand", "charm",
];

function parseBuild(rawBuild) {
    const build = typeof rawBuild === "string" ? JSON.parse(rawBuild) : rawBuild;
    if (!build?.player) {
        throw new Error("Template JSON must be a single-player simulator export.");
    }
    return build;
}

function createTriggers(build, hrid) {
    const triggerDetails = build.triggerMap?.[hrid];
    if (!triggerDetails) {
        return null;
    }
    return triggerDetails.slice(0, 4).map((trigger) => new Trigger(
        trigger.dependencyHrid,
        trigger.conditionHrid,
        trigger.comparatorHrid,
        Number(trigger.value)
    ));
}

function createPlayer(build, hrid) {
    const player = new Player();
    const details = build.player;
    player.hrid = hrid;
    player.staminaLevel = Number(details.staminaLevel ?? 1);
    player.intelligenceLevel = Number(details.intelligenceLevel ?? 1);
    player.attackLevel = Number(details.attackLevel ?? 1);
    player.meleeLevel = Number(details.meleeLevel ?? details.powerLevel ?? 1);
    player.defenseLevel = Number(details.defenseLevel ?? 1);
    player.rangedLevel = Number(details.rangedLevel ?? 1);
    player.magicLevel = Number(details.magicLevel ?? 1);
    player.debuffOnLevelGap = 0;
    player.guildTrialRegenBonus = 0.03;
    player.zoneBuffs = [];
    player.extraBuffs = [];

    for (const type of EQUIPMENT_TYPES) {
        const item = (details.equipment ?? []).find(
            (entry) => entry.itemLocationHrid === `/item_locations/${type}`
        );
        if (item) {
            player.equipment[`/equipment_types/${type}`] = new Equipment(
                item.itemHrid,
                Number(item.enhancementLevel ?? 0)
            );
        }
    }

    player.food = [];
    player.drinks = [];
    player.abilities = (build.abilities ?? []).flatMap((ability, index) => {
        if (!ability?.abilityHrid) {
            return [];
        }
        const parsedAbility = new Ability(
            ability.abilityHrid,
            Number(ability.level ?? 1),
            createTriggers(build, ability.abilityHrid)
        );
        return parsedAbility.isSpecialAbility === (index === 0) ? [parsedAbility] : [];
    });

    player.houseRooms = Object.entries(build.houseRooms ?? {})
        .filter(([, level]) => Number(level) > 0)
        .map(([roomHrid, level]) => new HouseRoom(roomHrid, Number(level)));
    player.achievements = new Achievement(build.achievements ?? {});
    return player;
}

function expandTemplates(templates) {
    const players = [];
    const playerTemplateMap = {};
    for (const template of templates) {
        const build = parseBuild(template.build);
        for (let index = 0; index < Number(template.count); index++) {
            const hrid = `player_${players.length + 1}`;
            players.push(createPlayer(build, hrid));
            playerTemplateMap[hrid] = template.name;
        }
    }
    return { players, playerTemplateMap };
}

function sumDamage(attacks) {
    let damage = 0;
    for (const targets of Object.values(attacks ?? {})) {
        for (const abilities of Object.values(targets ?? {})) {
            for (const hits of Object.values(abilities ?? {})) {
                for (const [hit, count] of Object.entries(hits ?? {})) {
                    const hitDamage = Number(hit);
                    if (Number.isFinite(hitDamage)) {
                        damage += hitDamage * count;
                    }
                }
            }
        }
    }
    return damage;
}

function getOutOfManaRatio(simResult, playerHrid) {
    const duration = Number(simResult.simulatedTime);
    const manaState = simResult.playerRanOutOfManaTime[playerHrid];
    if (!manaState || duration <= 0) {
        return 0;
    }
    const unfinishedDuration = manaState.isOutOfMana
        ? Math.max(0, duration - manaState.startTimeForOutOfMana)
        : 0;
    return Math.min(1, Math.max(0,
        (manaState.totalTimeForOutOfMana + unfinishedDuration) / duration
    ));
}

function summarize(simResult, playerTemplateMap) {
    const templateStats = {};
    for (const [playerHrid, templateName] of Object.entries(playerTemplateMap)) {
        if (!templateStats[templateName]) {
            templateStats[templateName] = {
                count: 0,
                alive: 0,
                damage: 0,
                healing: 0,
                healthRestored: 0,
                outOfManaPercent: 0,
                deaths: 0,
            };
        }
        const stats = templateStats[templateName];
        stats.count += 1;
        stats.damage += sumDamage({ [playerHrid]: simResult.attacks[playerHrid] });
        stats.healing += Object.values(simResult.healingDone[playerHrid] ?? {})
            .reduce((total, amount) => total + amount, 0);
        stats.healthRestored += Object.values(simResult.hitpointsGained[playerHrid] ?? {})
            .reduce((total, amount) => total + amount, 0);
        stats.outOfManaPercent += getOutOfManaRatio(simResult, playerHrid) * 100;
        stats.deaths += simResult.deaths[playerHrid] ?? 0;
    }

    for (const stats of Object.values(templateStats)) {
        stats.outOfManaPercent /= stats.count;
    }

    for (const player of simResult.guildTrial.remainingPlayers) {
        if (player.currentHitpoints > 0) {
            templateStats[playerTemplateMap[player.hrid]].alive += 1;
        }
    }

    return {
        ...simResult.guildTrial,
        simulatedSeconds: simResult.simulatedTime / 1e9,
        totalDamage: Object.values(templateStats).reduce(
            (total, stats) => total + stats.damage,
            0
        ),
        templateStats,
    };
}

self.onmessage = async (event) => {
    if (event.data.type !== "start_guild_trial") {
        return;
    }

    try {
        const { players, playerTemplateMap } = expandTemplates(event.data.templates);
        if (players.length === 0) {
            throw new Error("At least one combatant is required.");
        }

        const trial = new GuildTrial(event.data.encounterHrid, {
            startLevel: Number(event.data.startLevel),
            maxLevel: Number(event.data.maxLevel),
            participantCount: players.length,
        });
        const simulator = new CombatSimulator(players, trial, null, {
            maxParryAttempts: 5,
        });
        simulator.addEventListener("progress", (progressEvent) => {
            self.postMessage({
                type: "guild_trial_progress",
                progress: progressEvent.detail.progress,
                currentLevel: trial.currentLevel,
                layersCompleted: trial.layersCompleted,
            });
        });

        const simResult = await simulator.simulate(Number(event.data.timeLimitSeconds) * 1e9);
        self.postMessage({
            type: "guild_trial_result",
            result: summarize(simResult, playerTemplateMap),
        });
    } catch (error) {
        self.postMessage({
            type: "guild_trial_error",
            error: error instanceof Error ? error.message : String(error),
        });
    }
};
