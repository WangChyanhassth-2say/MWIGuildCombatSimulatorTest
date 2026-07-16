import abilitiesMap from "../combatsimulator/data/abilityDetailMap.json";
import comparatorsMap from "../combatsimulator/data/combatTriggerComparatorDetailMap.json";
import conditionsMap from "../combatsimulator/data/combatTriggerConditionDetailMap.json";
import dependenciesMap from "../combatsimulator/data/combatTriggerDependencyDetailMap.json";
import itemsMap from "../combatsimulator/data/itemDetailMap.json";

const STORAGE_KEY = "mwi-guild-trial-layout-v3";
const OLD_STORAGE_KEY = "mwi-guild-trial-layout-v2";
const MAX_TRIGGERS = 4;
const clone = (value) => JSON.parse(JSON.stringify(value));
const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const format = (value) => new Intl.NumberFormat("zh-CN").format(Math.round(Number(value) || 0));
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;",
}[character]));

const encounters = [
    ["/guild_trial_encounters/badger", "encounterBadger"],
    ["/guild_trial_encounters/chameleon", "encounterChameleon"],
    ["/guild_trial_encounters/jellyfish", "encounterJellyfish"],
    ["/guild_trial_encounters/hedgehog", "encounterHedgehog"],
    ["/guild_trial_encounters/swarm", "encounterSwarm"],
];
const skills = [
    ["stamina", "耐力"], ["intelligence", "智力"], ["attack", "攻击"],
    ["melee", "近战"], ["defense", "防御"], ["ranged", "远程"], ["magic", "魔法"],
];
const slots = [
    ["head", "头部"], ["body", "身体"], ["legs", "腿部"], ["feet", "脚部"],
    ["hands", "手部"], ["main_hand", "主手"], ["two_hand", "双手武器"],
    ["off_hand", "副手"], ["pouch", "袋子"], ["back", "背部"], ["neck", "项链"],
    ["earrings", "耳环"], ["ring", "戒指"], ["charm", "护符"],
];
const reasonNames = {
    party_wiped: "reasonPartyWiped",
    max_level_completed: "reasonMaxLevel",
    time_limit: "reasonTimeLimit",
    stopped: "reasonStopped",
};
const trialMessages = {
    zh: {
        title: "MWI 公会战斗试炼模拟器", startLevel: "起始等级", maxLevel: "最高等级", timeLimit: "模拟时限（分钟）",
        fixedPresets: "固定预设", addFixedPreset: "添加固定预设", defaultPresets: "默认预设", addDefaultPreset: "添加默认预设",
        startSimulation: "开始模拟", running: "模拟中…", combinedPoints: "合计积分：{value}",
        fixed: "固定", default: "默认", noWeapon: "未装备武器", noPresets: "暂无{type}预设",
        presetHint: "点击编辑；右键复制或删除；拖动到阵容", copyPreset: "复制预设", deletePreset: "删除预设", copySuffix: "副本",
        boss: "Boss {number}", randomDefaultCount: "随机默认预设数", fill: "填充", clear: "清空",
        assigned: "已分配 {count}/40", rosterHint: "拖入预设；点击格子移除", emptySlot: "空阵容格",
        simulationStats: "模拟统计", layers: "通过层数", reachedLevel: "到达等级", points: "基础积分",
        participants: "参战人数", duration: "模拟时间", minutes: "{value} 分钟", totalDamage: "总伤害",
        endReason: "结束原因", remainingHp: "当前怪物剩余生命", preset: "预设", count: "人数", alive: "存活",
        damage: "伤害", healing: "治疗输出", restored: "获得回复", oom: "平均缺蓝", deaths: "死亡次数", noStats: "没有统计数据",
        progress: "当前等级 {level}，已通过 {layers} 层", presetName: "预设名称", levels: "等级", equipment: "装备",
        abilities: "技能与触发器", specialAbility: "特殊技能", abilitySlot: "技能槽", abilityLevel: "技能等级", triggers: "触发器",
        moveUp: "上移", moveDown: "下移",
        addTrigger: "添加条件", noTriggers: "无触发条件", none: "无", jsonTitle: "配置 JSON",
        jsonHint: "可粘贴原版模拟器导出的单人配置，也可将当前预设导出到此处。",
        importJson: "从 JSON 导入", exportJson: "导出当前 JSON", cancel: "取消", savePreset: "保存预设",
        jsonImported: "JSON 已导入到当前预设。", jsonExported: "当前配置已导出到文本框，并尝试复制到剪贴板。",
        jsonImportFailed: "导入失败：{message}", missingPlayer: "JSON 中缺少 player 配置",
        needDefault: "请先创建至少一个默认预设。", enhancement: "强化等级",
        fixedPresetNumber: "固定预设 {number}", defaultPresetNumber: "默认预设 {number}",
        encounterBadger: "试炼獾", encounterChameleon: "试炼变色龙", encounterJellyfish: "试炼水母",
        encounterHedgehog: "试炼刺猬", encounterSwarm: "试炼虫群",
        reasonPartyWiped: "队伍团灭", reasonMaxLevel: "完成最高等级", reasonTimeLimit: "达到模拟时限", reasonStopped: "模拟停止",
        update20260716Title: "2026.7.16更新：",
        update20260716Content: "在队伍中，较弱玩家的光环或减益不再覆盖较强的效果。同一增益会以当前最强的来源生效，该来源到期后由次强的接替。",
        update20260710Title: "2026.7.10更新：",
        update20260710Architecture: "公会试炼模拟器架构设计；",
        update20260710Regen: "禁用食物饮料，改为3%自动回血回蓝；",
        update20260710Parry: "君王剑格挡允许单次攻击最多判定5次；",
    },
    en: {
        title: "MWI Guild Combat Trial Simulator", startLevel: "Start Level", maxLevel: "Max Level", timeLimit: "Time Limit (minutes)",
        fixedPresets: "Fixed Presets", addFixedPreset: "Add Fixed Preset", defaultPresets: "Default Presets", addDefaultPreset: "Add Default Preset",
        startSimulation: "Start Simulation", running: "Simulating…", combinedPoints: "Total Points: {value}",
        fixed: "Fixed", default: "Default", noWeapon: "No weapon", noPresets: "No {type} presets",
        presetHint: "Click to edit; right-click to copy or delete; drag into a roster", copyPreset: "Copy Preset", deletePreset: "Delete Preset", copySuffix: "Copy",
        boss: "Boss {number}", randomDefaultCount: "Random Default Presets", fill: "Fill", clear: "Clear",
        assigned: "Assigned {count}/40", rosterHint: "Drag in a preset; click a slot to remove it", emptySlot: "Empty roster slot",
        simulationStats: "Simulation Statistics", layers: "Layers Cleared", reachedLevel: "Level Reached", points: "Base Points",
        participants: "Participants", duration: "Simulation Time", minutes: "{value} minutes", totalDamage: "Total Damage",
        endReason: "End Reason", remainingHp: "Remaining Enemy HP", preset: "Preset", count: "Count", alive: "Alive",
        damage: "Damage", healing: "Healing Done", restored: "HP Restored", oom: "Average OOM", deaths: "Deaths", noStats: "No statistics",
        progress: "Level {level}, {layers} layers cleared", presetName: "Preset Name", levels: "Levels", equipment: "Equipment",
        abilities: "Abilities & Triggers", specialAbility: "Special Ability", abilitySlot: "Ability Slot", abilityLevel: "Ability Level", triggers: "Triggers",
        moveUp: "Move Up", moveDown: "Move Down",
        addTrigger: "Add Trigger", noTriggers: "No triggers", none: "None", jsonTitle: "Configuration JSON",
        jsonHint: "Paste a single-player export from the original simulator, or export this preset here.",
        importJson: "Import JSON", exportJson: "Export Current JSON", cancel: "Cancel", savePreset: "Save Preset",
        jsonImported: "JSON imported into this preset.", jsonExported: "Configuration exported to the text area and copied when permitted.",
        jsonImportFailed: "Import failed: {message}", missingPlayer: "The JSON does not contain a player configuration",
        needDefault: "Create at least one default preset first.", enhancement: "Enhancement Level",
        fixedPresetNumber: "Fixed Preset {number}", defaultPresetNumber: "Default Preset {number}",
        encounterBadger: "Trial Badger", encounterChameleon: "Trial Chameleon", encounterJellyfish: "Trial Jellyfish",
        encounterHedgehog: "Trial Hedgehog", encounterSwarm: "Trial Swarm",
        reasonPartyWiped: "Party Wiped", reasonMaxLevel: "Maximum Level Completed", reasonTimeLimit: "Time Limit Reached", reasonStopped: "Simulation Stopped",
        update20260716Title: "2026.7.16 Update:",
        update20260716Content: "In a party, weaker players' auras or debuffs no longer override stronger effects. Each buff uses its strongest active source, then falls back to the next strongest when that source expires.",
        update20260710Title: "2026.7.10 Update:",
        update20260710Architecture: "Designed the guild trial simulator architecture;",
        update20260710Regen: "Disabled food and drinks and added 3% automatic HP/MP regeneration;",
        update20260710Parry: "Regal Sword parry can be checked up to five times per attack;",
    },
};

function currentLanguage() {
    return (window.i18next?.resolvedLanguage || window.i18next?.language || localStorage.getItem("i18nextLng") || "zh")
        .toLowerCase().startsWith("en") ? "en" : "zh";
}

function tr(key, values = {}) {
    let message = trialMessages[currentLanguage()][key] ?? trialMessages.zh[key] ?? key;
    for (const [name, value] of Object.entries(values)) {
        message = message.replaceAll(`{${name}}`, value);
    }
    return message;
}

let state;
let editingId = null;
let editorDraft = null;
let isRunning = false;
const workers = [];

function defaultBuild() {
    return {
        player: {
            attackLevel: 100, magicLevel: 100, meleeLevel: 100, rangedLevel: 100,
            defenseLevel: 100, staminaLevel: 100, intelligenceLevel: 100, equipment: [],
        },
        food: { "/action_types/combat": [] },
        drinks: { "/action_types/combat": [] },
        abilities: Array.from({ length: 5 }, () => ({ abilityHrid: "", level: 1 })),
        triggerMap: {},
        houseRooms: {},
        achievements: {},
    };
}

function defaultPreset(type, name) {
    return { id: createId(), type, name, build: defaultBuild() };
}

function blankBoss(encounterHrid) {
    return {
        encounterHrid,
        slots: Array(40).fill(null),
        randomCount: 1,
        result: null,
        progress: null,
    };
}

function normalizeState(saved) {
    const presets = (saved?.presets || []).map((preset) => ({
        ...preset,
        id: preset.id || createId(),
        type: preset.type === "default" ? "default" : "fixed",
        build: typeof preset.build === "string" ? JSON.parse(preset.build) : preset.build,
    }));
    if (!presets.some((preset) => preset.type === "fixed")) {
        presets.push(defaultPreset("fixed", tr("fixedPresets")));
    }
    if (!presets.some((preset) => preset.type === "default")) {
        presets.push(defaultPreset("default", tr("defaultPresets")));
    }
    const loadedBosses = saved?.bosses || [];
    return {
        settings: {
            startLevel: Number(saved?.settings?.startLevel) || 100,
            maxLevel: Number(saved?.settings?.maxLevel) || 300,
            timeLimitMinutes: Number(saved?.settings?.timeLimitMinutes) || 60,
        },
        presets,
        bosses: [0, 1].map((index) => {
            const source = loadedBosses[index] || {};
            return {
                ...blankBoss(encounters[index][0]),
                ...source,
                slots: [...(source.slots || []), ...Array(40).fill(null)].slice(0, 40),
                randomCount: Number(source.randomCount) || 1,
                result: null,
                progress: null,
            };
        }),
    };
}

function loadState() {
    try {
        const current = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (current) return normalizeState(current);
    } catch (error) {
        console.warn("无法读取试炼配置", error);
    }
    try {
        const previous = JSON.parse(localStorage.getItem(OLD_STORAGE_KEY));
        if (previous) return normalizeState(previous);
    } catch (error) {
        console.warn("无法迁移旧试炼配置", error);
    }
    return normalizeState(null);
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        settings: state.settings,
        presets: state.presets,
        bosses: state.bosses.map(({ encounterHrid, slots, randomCount }) => ({
            encounterHrid, slots, randomCount,
        })),
    }));
}

function localizedName(group, detail) {
    if (!detail) return "";
    return window.i18next?.t(`${group}.${detail.hrid}`, { defaultValue: detail.name }) || detail.name;
}

const slotTranslationKeys = {
    head: "head", body: "body", legs: "legs", feet: "feet", hands: "hands",
    main_hand: "mainHand", two_hand: "twoHand", off_hand: "offHand", pouch: "pouch",
    back: "back", neck: "neck", earrings: "earrings", ring: "ring", charm: "charm",
};

function localizedSkillName(skill, fallback) {
    return window.i18next?.t(`skillNames./skills/${skill}`, { defaultValue: fallback }) || fallback;
}

function localizedSlotName(slot, fallback) {
    if (slot === "two_hand") {
        return currentLanguage() === "en" ? "Two-Handed Weapon" : fallback;
    }
    return window.i18next?.t(`characterItemsUtil.${slotTranslationKeys[slot]}`, { defaultValue: fallback }) || fallback;
}

function presetWeapon(preset) {
    const item = preset.build.player.equipment.find((equipment) =>
        equipment.itemLocationHrid.endsWith("main_hand") || equipment.itemLocationHrid.endsWith("two_hand"));
    return item ? localizedName("itemNames", itemsMap[item.itemHrid]) : tr("noWeapon");
}

function renderPresetGroups() {
    for (const type of ["fixed", "default"]) {
        const target = document.getElementById(`${type}Presets`);
        const presets = state.presets.filter((preset) => preset.type === type);
        target.innerHTML = presets.map((preset) => `
            <article class="preset-card ${type} border rounded p-2 text-center"
                draggable="true" data-preset-id="${escapeHtml(preset.id)}" title="${escapeHtml(tr("presetHint"))}">
                <div class="fw-bold preset-name">${escapeHtml(preset.name)}</div>
                <small class="d-block preset-name">${escapeHtml(presetWeapon(preset))}</small>
                <small>${tr(type)}</small>
            </article>
        `).join("");
        if (!presets.length) target.innerHTML = `<span class="text-muted small">${escapeHtml(tr("noPresets", { type: tr(type) }))}</span>`;
    }
    document.querySelectorAll(".preset-card").forEach((card) => {
        card.addEventListener("dragstart", (event) => {
            event.dataTransfer.effectAllowed = "copy";
            event.dataTransfer.setData("text/plain", card.dataset.presetId);
        });
    });
}

function showPresetContextMenu(presetId, clientX, clientY) {
    const container = document.getElementById("presetContextMenu");
    const left = Math.min(clientX, window.innerWidth - 145);
    const top = Math.min(clientY, window.innerHeight - 85);
    container.innerHTML = `
        <div class="preset-context-menu" style="left:${left}px;top:${top}px">
            <button data-context-action="copy" data-preset-id="${escapeHtml(presetId)}">${tr("copyPreset")}</button>
            <button class="delete-action" data-context-action="delete" data-preset-id="${escapeHtml(presetId)}">${tr("deletePreset")}</button>
        </div>
    `;
}

function hidePresetContextMenu() {
    document.getElementById("presetContextMenu").innerHTML = "";
}

function assignedCount(boss) {
    return boss.slots.filter(Boolean).length;
}

function summaryHtml(result) {
    if (!result) return "";
    const remainingHp = (result.remainingEnemies || [])
        .reduce((total, enemy) => total + Number(enemy.currentHitpoints || 0), 0);
    const duration = tr("minutes", { value: (Number(result.simulatedSeconds || 0) / 60).toFixed(2) });
    const summary = [
        [tr("layers"), result.layersCompleted],
        [tr("reachedLevel"), result.currentLevel],
        [tr("points"), format(result.points)],
        [tr("participants"), result.participantCount],
        [tr("duration"), duration],
        [tr("totalDamage"), format(result.totalDamage)],
        [tr("endReason"), tr(reasonNames[result.endedReason] || result.endedReason)],
        [tr("remainingHp"), format(remainingHp)],
    ];
    const rows = Object.entries(result.templateStats || {}).map(([name, stats]) => `
        <tr>
            <td>${escapeHtml(name)}</td>
            <td class="text-end">${stats.count}</td>
            <td class="text-end">${stats.alive}</td>
            <td class="text-end">${format(stats.damage)}</td>
            <td class="text-end">${format(stats.healing)}</td>
            <td class="text-end">${format(stats.healthRestored)}</td>
            <td class="text-end">${Number(stats.outOfManaPercent || 0).toFixed(2)}%</td>
            <td class="text-end">${stats.deaths}</td>
        </tr>
    `).join("");
    return `
        <div class="mt-3">
            <h6>${tr("simulationStats")}</h6>
            <div class="summary-grid">
                ${summary.map(([label, value]) => `<div class="summary-item"><small>${label}</small><strong>${value}</strong></div>`).join("")}
            </div>
            <div class="table-responsive mt-3">
                <table class="table table-sm table-bordered align-middle mb-0">
                    <thead class="table-light"><tr><th>${tr("preset")}</th><th class="text-end">${tr("count")}</th><th class="text-end">${tr("alive")}</th><th class="text-end">${tr("damage")}</th><th class="text-end">${tr("healing")}</th><th class="text-end">${tr("restored")}</th><th class="text-end">${tr("oom")}</th><th class="text-end">${tr("deaths")}</th></tr></thead>
                    <tbody>${rows || `<tr><td colspan="8" class="text-center text-muted">${tr("noStats")}</td></tr>`}</tbody>
                </table>
            </div>
        </div>
    `;
}

function renderBosses() {
    document.getElementById("bosses").innerHTML = state.bosses.map((boss, bossIndex) => `
        <div class="col-xl-6">
            <section class="outlined-box h-100">
                <div class="d-flex flex-wrap align-items-end gap-2 mb-3">
                    <div class="flex-grow-1">
                        <label class="form-label fw-bold" for="encounter-${bossIndex}">${tr("boss", { number: bossIndex + 1 })}</label>
                        <select id="encounter-${bossIndex}" class="form-select" data-boss-field="encounterHrid" data-boss-index="${bossIndex}">
                            ${encounters.map(([value, label]) => `<option value="${value}" ${boss.encounterHrid === value ? "selected" : ""}>${tr(label)}</option>`).join("")}
                        </select>
                    </div>
                    <div>
                        <label class="form-label" for="random-${bossIndex}">${tr("randomDefaultCount")}</label>
                        <div class="input-group">
                            <input id="random-${bossIndex}" class="form-control" type="number" min="1" max="40" value="${boss.randomCount}" data-boss-field="randomCount" data-boss-index="${bossIndex}">
                            <button class="btn btn-secondary" data-action="random-fill" data-boss-index="${bossIndex}">${tr("fill")}</button>
                        </div>
                    </div>
                    <button class="btn btn-outline-danger" data-action="clear-roster" data-boss-index="${bossIndex}">${tr("clear")}</button>
                </div>
                <div class="d-flex justify-content-between small text-muted mb-2">
                    <span>${tr("assigned", { count: assignedCount(boss) })}</span>
                    <span>${tr("rosterHint")}</span>
                </div>
                <div class="roster-grid">
                    ${boss.slots.map((presetId, slotIndex) => {
                        const preset = state.presets.find((item) => item.id === presetId);
                        return `<button class="roster-slot ${preset?.type || ""}" data-boss-index="${bossIndex}" data-slot-index="${slotIndex}" title="${escapeHtml(preset?.name || tr("emptySlot"))}">
                            <span class="slot-number">${slotIndex + 1}</span>
                            <span class="slot-label">${escapeHtml(preset ? preset.name.slice(0, 4) : "+")}</span>
                        </button>`;
                    }).join("")}
                </div>
                ${boss.progress ? `
                    <div class="progress mt-3">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" style="width:${Math.max(5, Math.min(100, boss.progress.percent || 5))}%">
                            ${tr("progress", { level: boss.progress.level, layers: boss.progress.layers })}
                        </div>
                    </div>` : ""}
                ${summaryHtml(boss.result)}
            </section>
        </div>
    `).join("");

    document.querySelectorAll(".roster-slot").forEach((slot) => {
        slot.addEventListener("dragover", (event) => event.preventDefault());
        slot.addEventListener("drop", (event) => {
            event.preventDefault();
            const presetId = event.dataTransfer.getData("text/plain");
            if (!state.presets.some((preset) => preset.id === presetId)) return;
            const boss = state.bosses[Number(slot.dataset.bossIndex)];
            boss.slots[Number(slot.dataset.slotIndex)] = presetId;
            saveAndRender();
        });
    });
}

function renderCombinedResult() {
    const completed = state.bosses.every((boss) => boss.result);
    document.getElementById("combinedPoints").textContent = completed
        ? tr("combinedPoints", { value: format(state.bosses.reduce((total, boss) => total + Number(boss.result.points || 0), 0)) })
        : "";
}

function saveAndRender() {
    saveState();
    renderPresetGroups();
    renderBosses();
    renderCombinedResult();
}

function updateStaticTranslations() {
    document.documentElement.lang = currentLanguage() === "en" ? "en" : "zh-CN";
    document.title = tr("title");
    document.querySelectorAll("[data-trial-i18n]").forEach((element) => {
        element.textContent = tr(element.dataset.trialI18n);
    });
    document.getElementById("runBoth").textContent = tr(isRunning ? "running" : "startSimulation");
}

function equipmentAt(slot) {
    return editorDraft.build.player.equipment.find((item) => item.itemLocationHrid === `/item_locations/${slot}`);
}

function conditionsFor(trigger) {
    const dependency = dependenciesMap[trigger.dependencyHrid];
    return Object.values(conditionsMap)
        .filter((condition) => dependency?.isSingleTarget ? condition.isSingleTarget : condition.isMultiTarget)
        .sort((a, b) => a.sortIndex - b.sortIndex);
}

function comparatorsFor(trigger) {
    return (conditionsMap[trigger.conditionHrid]?.allowedComparatorHrids || [])
        .map((hrid) => comparatorsMap[hrid]).filter(Boolean);
}

function optionsHtml(items, value, group) {
    return items.map((item) => `<option value="${escapeHtml(item.hrid)}" ${item.hrid === value ? "selected" : ""}>${escapeHtml(localizedName(group, item))}</option>`).join("");
}

function renderEditor(restoreScroll = 0) {
    if (!editorDraft) {
        document.getElementById("presetEditor").innerHTML = "";
        return;
    }
    editorDraft.build.triggerMap ||= {};
    for (const [hrid, triggers] of Object.entries(editorDraft.build.triggerMap)) {
        editorDraft.build.triggerMap[hrid] = (triggers || []).slice(0, MAX_TRIGGERS);
    }
    editorDraft.build.abilities ||= [];
    while (editorDraft.build.abilities.length < 5) {
        editorDraft.build.abilities.push({ abilityHrid: "", level: 1 });
    }
    editorDraft.build.abilities = editorDraft.build.abilities.slice(0, 5);
    editorDraft.build.abilities.forEach((ability, index) => {
        const detail = abilitiesMap[ability.abilityHrid];
        if (detail && Boolean(detail.isSpecialAbility) !== (index === 0)) {
            ability.abilityHrid = "";
        }
    });
    const dependencies = Object.values(dependenciesMap).sort((a, b) => a.sortIndex - b.sortIndex);
    const abilities = Object.values(abilitiesMap).sort((a, b) =>
        localizedName("abilityNames", a).localeCompare(localizedName("abilityNames", b), "zh-CN"));
    const target = document.getElementById("presetEditor");
    target.innerHTML = `
        <div class="editor-backdrop">
            <section class="editor-dialog">
                <header class="d-flex align-items-center gap-2 p-3 border-bottom bg-light">
                    <input id="editorName" class="form-control" value="${escapeHtml(editorDraft.name)}" placeholder="${tr("presetName")}">
                    <select id="editorType" class="form-select" style="max-width:150px">
                        <option value="fixed" ${editorDraft.type === "fixed" ? "selected" : ""}>${tr("fixedPresets")}</option>
                        <option value="default" ${editorDraft.type === "default" ? "selected" : ""}>${tr("defaultPresets")}</option>
                    </select>
                    <button class="btn-close" data-editor-action="close"></button>
                </header>
                <div class="editor-body p-3">
                    <section class="editor-section mb-3">
                        <h5>${tr("levels")}</h5>
                        <div class="row g-2">
                            ${skills.map(([skill, label]) => `<div class="col-sm-6 col-lg"><label class="form-label">${localizedSkillName(skill, label)}</label><input class="form-control" type="number" min="1" max="400" value="${Number(editorDraft.build.player[`${skill}Level`] || 1)}" data-level="${skill}"></div>`).join("")}
                        </div>
                    </section>
                    <section class="editor-section mb-3">
                        <h5>${tr("equipment")}</h5>
                        <div class="equipment-grid">
                            ${slots.map(([slot, label]) => {
                                const selected = equipmentAt(slot);
                                const items = Object.values(itemsMap)
                                    .filter((item) => item.equipmentDetail?.type === `/equipment_types/${slot}`)
                                    .sort((a, b) => a.sortIndex - b.sortIndex);
                                return `<div class="equipment-row">
                                    <label>${localizedSlotName(slot, label)}</label>
                                    <select class="form-select form-select-sm" data-equipment="${slot}">
                                        <option value="">${tr("none")}</option>
                                        ${optionsHtml(items, selected?.itemHrid, "itemNames")}
                                    </select>
                                    <input class="form-control form-control-sm" type="number" min="0" max="20" value="${selected?.enhancementLevel || 0}" data-enhancement="${slot}" title="${tr("enhancement")}">
                                </div>`;
                            }).join("")}
                        </div>
                    </section>
                    <section class="editor-section mb-3">
                        <h5>${tr("abilities")}</h5>
                        <div class="d-grid gap-2">
                            ${editorDraft.build.abilities.map((ability, abilityIndex) => {
                                const triggers = ability.abilityHrid ? (editorDraft.build.triggerMap[ability.abilityHrid] || []) : [];
                                const slotAbilities = abilities.filter((item) =>
                                    Boolean(item.isSpecialAbility) === (abilityIndex === 0));
                                return `<article class="ability-panel">
                                    <div class="row g-2">
                                        <div class="col-md-9">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <label class="form-label">${abilityIndex === 0 ? tr("specialAbility") : tr("abilitySlot")}</label>
                                                ${abilityIndex === 0 ? "" : `<div class="btn-group btn-group-sm mb-2">
                                                    <button class="btn btn-outline-secondary" data-editor-action="move-ability" data-ability-index="${abilityIndex}" data-step="-1" title="${tr("moveUp")}" ${abilityIndex === 1 ? "disabled" : ""}>↑</button>
                                                    <button class="btn btn-outline-secondary" data-editor-action="move-ability" data-ability-index="${abilityIndex}" data-step="1" title="${tr("moveDown")}" ${abilityIndex === 4 ? "disabled" : ""}>↓</button>
                                                </div>`}
                                            </div>
                                            <select class="form-select" data-ability="${abilityIndex}">
                                                <option value="">${tr("none")}</option>
                                                ${optionsHtml(slotAbilities, ability.abilityHrid, "abilityNames")}
                                            </select>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label">${tr("abilityLevel")}</label>
                                            <input class="form-control" type="number" min="1" max="400" value="${Number(ability.level || 1)}" data-ability-level="${abilityIndex}">
                                        </div>
                                    </div>
                                    ${ability.abilityHrid ? `
                                        <div class="d-flex justify-content-between align-items-center mt-2">
                                            <strong>${tr("triggers")}</strong>
                                            <button class="btn btn-outline-primary btn-sm" data-editor-action="add-trigger" data-ability-hrid="${escapeHtml(ability.abilityHrid)}" ${triggers.length >= MAX_TRIGGERS ? "disabled" : ""}>${tr("addTrigger")}</button>
                                        </div>
                                        ${triggers.map((trigger, triggerIndex) => `<div class="trigger-row">
                                            <select class="form-select form-select-sm" data-trigger-dependency="${escapeHtml(ability.abilityHrid)}|${triggerIndex}">
                                                ${optionsHtml(dependencies, trigger.dependencyHrid, "combatTriggerDependencyNames")}
                                            </select>
                                            <select class="form-select form-select-sm" data-trigger-condition="${escapeHtml(ability.abilityHrid)}|${triggerIndex}">
                                                ${optionsHtml(conditionsFor(trigger), trigger.conditionHrid, "combatTriggerConditionNames")}
                                            </select>
                                            <select class="form-select form-select-sm" data-trigger-comparator="${escapeHtml(ability.abilityHrid)}|${triggerIndex}">
                                                ${optionsHtml(comparatorsFor(trigger), trigger.comparatorHrid, "combatTriggerComparatorNames")}
                                            </select>
                                            <input class="form-control form-control-sm" type="number" value="${Number(trigger.value || 0)}" data-trigger-value="${escapeHtml(ability.abilityHrid)}|${triggerIndex}" ${comparatorsMap[trigger.comparatorHrid]?.allowValue ? "" : "disabled"}>
                                            <button class="btn btn-outline-danger btn-sm" data-editor-action="remove-trigger" data-trigger="${escapeHtml(ability.abilityHrid)}|${triggerIndex}">×</button>
                                        </div>`).join("") || `<p class="small text-muted mt-2 mb-0">${tr("noTriggers")}</p>`}
                                    ` : ""}
                                </article>`;
                            }).join("")}
                        </div>
                    </section>
                    <section class="editor-section">
                        <h5>${tr("jsonTitle")}</h5>
                        <p class="small text-muted">${tr("jsonHint")}</p>
                        <textarea id="editorJson" class="form-control font-monospace" rows="16">${escapeHtml(JSON.stringify(editorDraft.build, null, 2))}</textarea>
                        <div class="d-flex flex-wrap gap-2 mt-2">
                            <button class="btn btn-outline-primary btn-sm" data-editor-action="import-json">${tr("importJson")}</button>
                            <button class="btn btn-outline-secondary btn-sm" data-editor-action="export-json">${tr("exportJson")}</button>
                        </div>
                        <div id="editorJsonMessage" class="small mt-2"></div>
                    </section>
                </div>
                <footer class="d-flex justify-content-end gap-2 p-3 border-top bg-light">
                    <button class="btn btn-secondary" data-editor-action="close">${tr("cancel")}</button>
                    <button class="btn btn-primary" data-editor-action="save">${tr("savePreset")}</button>
                </footer>
            </section>
        </div>
    `;
    const body = target.querySelector(".editor-body");
    body.scrollTop = restoreScroll;
    bindEditorEvents();
}

function rerenderEditor() {
    const scrollTop = document.querySelector(".editor-body")?.scrollTop || 0;
    renderEditor(scrollTop);
}

function getTrigger(key) {
    const [hrid, index] = key.split("|");
    return editorDraft.build.triggerMap[hrid][Number(index)];
}

function bindEditorEvents() {
    document.getElementById("editorName").addEventListener("input", (event) => editorDraft.name = event.target.value);
    document.getElementById("editorType").addEventListener("change", (event) => editorDraft.type = event.target.value);
    document.querySelectorAll("[data-level]").forEach((input) => input.addEventListener("input", () => {
        editorDraft.build.player[`${input.dataset.level}Level`] = Number(input.value);
    }));
    document.querySelectorAll("[data-equipment]").forEach((select) => select.addEventListener("change", () => {
        const slot = select.dataset.equipment;
        const index = editorDraft.build.player.equipment.findIndex((item) => item.itemLocationHrid === `/item_locations/${slot}`);
        if (!select.value) {
            if (index >= 0) editorDraft.build.player.equipment.splice(index, 1);
        } else {
            const equipment = {
                itemLocationHrid: `/item_locations/${slot}`,
                itemHrid: select.value,
                enhancementLevel: index >= 0 ? editorDraft.build.player.equipment[index].enhancementLevel : 0,
            };
            if (index >= 0) editorDraft.build.player.equipment[index] = equipment;
            else editorDraft.build.player.equipment.push(equipment);
            if (slot === "main_hand" || slot === "two_hand") {
                const opposite = slot === "main_hand" ? "two_hand" : "main_hand";
                editorDraft.build.player.equipment = editorDraft.build.player.equipment
                    .filter((item) => item.itemLocationHrid !== `/item_locations/${opposite}`);
            }
        }
        rerenderEditor();
    }));
    document.querySelectorAll("[data-enhancement]").forEach((input) => input.addEventListener("input", () => {
        const equipment = equipmentAt(input.dataset.enhancement);
        if (equipment) equipment.enhancementLevel = Number(input.value);
    }));
    document.querySelectorAll("[data-ability]").forEach((select) => select.addEventListener("change", () => {
        const ability = editorDraft.build.abilities[Number(select.dataset.ability)];
        ability.abilityHrid = select.value;
        if (select.value && !editorDraft.build.triggerMap[select.value]) {
            editorDraft.build.triggerMap[select.value] = clone(abilitiesMap[select.value]?.defaultCombatTriggers || []);
        }
        rerenderEditor();
    }));
    document.querySelectorAll("[data-ability-level]").forEach((input) => input.addEventListener("input", () => {
        editorDraft.build.abilities[Number(input.dataset.abilityLevel)].level = Number(input.value);
    }));
    document.querySelectorAll("[data-trigger-dependency]").forEach((select) => select.addEventListener("change", () => {
        const trigger = getTrigger(select.dataset.triggerDependency);
        trigger.dependencyHrid = select.value;
        const conditions = conditionsFor(trigger);
        if (!conditions.some((condition) => condition.hrid === trigger.conditionHrid)) {
            trigger.conditionHrid = conditions[0]?.hrid || "";
        }
        trigger.comparatorHrid = comparatorsFor(trigger)[0]?.hrid || "";
        rerenderEditor();
    }));
    document.querySelectorAll("[data-trigger-condition]").forEach((select) => select.addEventListener("change", () => {
        const trigger = getTrigger(select.dataset.triggerCondition);
        trigger.conditionHrid = select.value;
        trigger.comparatorHrid = comparatorsFor(trigger)[0]?.hrid || "";
        rerenderEditor();
    }));
    document.querySelectorAll("[data-trigger-comparator]").forEach((select) => select.addEventListener("change", () => {
        getTrigger(select.dataset.triggerComparator).comparatorHrid = select.value;
        rerenderEditor();
    }));
    document.querySelectorAll("[data-trigger-value]").forEach((input) => input.addEventListener("input", () => {
        getTrigger(input.dataset.triggerValue).value = Number(input.value);
    }));
}

function openEditor(preset) {
    editingId = preset.id;
    editorDraft = clone(preset);
    renderEditor();
}

function closeEditor() {
    editingId = null;
    editorDraft = null;
    renderEditor();
}

function fillRandomDefaults(bossIndex) {
    const defaults = state.presets.filter((preset) => preset.type === "default");
    if (!defaults.length) {
        document.getElementById("runError").textContent = tr("needDefault");
        return;
    }
    const boss = state.bosses[bossIndex];
    const emptySlots = boss.slots.map((value, index) => value ? -1 : index).filter((index) => index >= 0);
    const count = Math.min(Math.max(1, Number(boss.randomCount) || 1), emptySlots.length);
    for (let index = 0; index < count; index++) {
        const preset = defaults[Math.floor(Math.random() * defaults.length)];
        boss.slots[emptySlots[index]] = preset.id;
    }
    document.getElementById("runError").textContent = "";
    saveAndRender();
}

function groupedTemplates(boss) {
    const counts = boss.slots.filter(Boolean)
        .reduce((map, id) => map.set(id, (map.get(id) || 0) + 1), new Map());
    return [...counts].map(([id, count]) => {
        const preset = state.presets.find((item) => item.id === id);
        return clone({ name: preset.name, count, build: preset.build });
    });
}

function runBoss(boss, index) {
    const templates = groupedTemplates(boss);
    if (!templates.length) {
        boss.result = { points: 0, layersCompleted: 0, currentLevel: state.settings.startLevel, participantCount: 0, totalDamage: 0, templateStats: {} };
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        workers[index]?.terminate();
        const worker = new Worker(new URL("../guildTrialWorker.js", import.meta.url));
        workers[index] = worker;
        worker.onmessage = ({ data }) => {
            if (data.type === "guild_trial_progress") {
                const range = Math.max(10, state.settings.maxLevel - state.settings.startLevel);
                boss.progress = {
                    level: data.currentLevel,
                    layers: data.layersCompleted,
                    percent: ((data.currentLevel - state.settings.startLevel) / range) * 100,
                };
                renderBosses();
            }
            if (data.type === "guild_trial_result") {
                boss.result = data.result;
                boss.progress = null;
                worker.terminate();
                renderBosses();
                resolve();
            }
            if (data.type === "guild_trial_error") {
                worker.terminate();
                reject(new Error(data.error));
            }
        };
        worker.onerror = (event) => reject(new Error(event.message));
        worker.postMessage(clone({
            type: "start_guild_trial",
            encounterHrid: boss.encounterHrid,
            startLevel: state.settings.startLevel,
            maxLevel: Math.max(state.settings.startLevel, state.settings.maxLevel),
            timeLimitSeconds: state.settings.timeLimitMinutes * 60,
            templates,
        }));
    });
}

async function runBoth() {
    const button = document.getElementById("runBoth");
    const error = document.getElementById("runError");
    isRunning = true;
    button.disabled = true;
    button.textContent = tr("running");
    error.textContent = "";
    state.bosses.forEach((boss) => {
        boss.result = null;
        boss.progress = null;
    });
    renderBosses();
    try {
        await Promise.all(state.bosses.map(runBoss));
    } catch (runError) {
        error.textContent = runError.message;
    } finally {
        isRunning = false;
        button.disabled = false;
        button.textContent = tr("startSimulation");
        renderCombinedResult();
    }
}

function bindPageEvents() {
    document.getElementById("addFixedPreset").addEventListener("click", () => {
        const preset = defaultPreset("fixed", tr("fixedPresetNumber", {
            number: state.presets.filter((item) => item.type === "fixed").length + 1,
        }));
        state.presets.push(preset);
        openEditor(preset);
    });
    document.getElementById("addDefaultPreset").addEventListener("click", () => {
        const preset = defaultPreset("default", tr("defaultPresetNumber", {
            number: state.presets.filter((item) => item.type === "default").length + 1,
        }));
        state.presets.push(preset);
        openEditor(preset);
    });
    document.getElementById("runBoth").addEventListener("click", runBoth);
    for (const [id, field] of [["startLevel", "startLevel"], ["maxLevel", "maxLevel"], ["timeLimit", "timeLimitMinutes"]]) {
        document.getElementById(id).addEventListener("change", (event) => {
            state.settings[field] = Number(event.target.value);
            saveState();
        });
    }
    document.addEventListener("contextmenu", (event) => {
        const presetCard = event.target.closest(".preset-card");
        if (!presetCard) {
            hidePresetContextMenu();
            return;
        }
        event.preventDefault();
        showPresetContextMenu(presetCard.dataset.presetId, event.clientX, event.clientY);
    });
    document.addEventListener("click", (event) => {
        const contextAction = event.target.closest("[data-context-action]");
        if (contextAction) {
            const id = contextAction.dataset.presetId;
            const preset = state.presets.find((item) => item.id === id);
            if (contextAction.dataset.contextAction === "copy" && preset) {
                const copied = clone(preset);
                copied.id = createId();
                copied.name = `${preset.name} ${tr("copySuffix")}`;
                const index = state.presets.findIndex((item) => item.id === id);
                state.presets.splice(index + 1, 0, copied);
            }
            if (contextAction.dataset.contextAction === "delete") {
                state.presets = state.presets.filter((item) => item.id !== id);
                state.bosses.forEach((boss) => {
                    boss.slots = boss.slots.map((slot) => slot === id ? null : slot);
                });
            }
            hidePresetContextMenu();
            saveAndRender();
            return;
        }
        hidePresetContextMenu();
        const editorAction = event.target.closest("[data-editor-action]");
        if (editorAction) {
            if (editorAction.dataset.editorAction === "close") closeEditor();
            if (editorAction.dataset.editorAction === "save") {
                const index = state.presets.findIndex((preset) => preset.id === editingId);
                if (index >= 0) state.presets[index] = clone(editorDraft);
                closeEditor();
                saveAndRender();
            }
            if (editorAction.dataset.editorAction === "add-trigger") {
                const hrid = editorAction.dataset.abilityHrid;
                editorDraft.build.triggerMap[hrid] ||= [];
                if (editorDraft.build.triggerMap[hrid].length >= MAX_TRIGGERS) {
                    return;
                }
                const dependency = Object.values(dependenciesMap).sort((a, b) => a.sortIndex - b.sortIndex)[0];
                const trigger = {
                    dependencyHrid: dependency.hrid,
                    conditionHrid: "/combat_trigger_conditions/current_hp",
                    comparatorHrid: "/combat_trigger_comparators/greater_than_equal",
                    value: 1,
                };
                editorDraft.build.triggerMap[hrid].push(trigger);
                rerenderEditor();
            }
            if (editorAction.dataset.editorAction === "remove-trigger") {
                const [hrid, index] = editorAction.dataset.trigger.split("|");
                editorDraft.build.triggerMap[hrid].splice(Number(index), 1);
                rerenderEditor();
            }
            if (editorAction.dataset.editorAction === "move-ability") {
                const index = Number(editorAction.dataset.abilityIndex);
                const targetIndex = index + Number(editorAction.dataset.step);
                if (index >= 1 && targetIndex >= 1 && targetIndex <= 4) {
                    [editorDraft.build.abilities[index], editorDraft.build.abilities[targetIndex]] =
                        [editorDraft.build.abilities[targetIndex], editorDraft.build.abilities[index]];
                    rerenderEditor();
                }
            }
            if (editorAction.dataset.editorAction === "import-json") {
                const message = document.getElementById("editorJsonMessage");
                try {
                    const imported = JSON.parse(document.getElementById("editorJson").value);
                    if (!imported?.player) throw new Error(tr("missingPlayer"));
                    imported.player.equipment ||= [];
                    imported.abilities ||= [];
                    imported.triggerMap ||= {};
                    imported.houseRooms ||= {};
                    imported.achievements ||= {};
                    editorDraft.build = imported;
                    rerenderEditor();
                    const success = document.getElementById("editorJsonMessage");
                    success.className = "small mt-2 text-success";
                    success.textContent = tr("jsonImported");
                } catch (error) {
                    message.className = "small mt-2 text-danger";
                    message.textContent = tr("jsonImportFailed", { message: error.message });
                }
            }
            if (editorAction.dataset.editorAction === "export-json") {
                const textarea = document.getElementById("editorJson");
                const json = JSON.stringify(editorDraft.build, null, 2);
                textarea.value = json;
                textarea.focus();
                textarea.select();
                navigator.clipboard?.writeText(json).catch(() => {});
                const message = document.getElementById("editorJsonMessage");
                message.className = "small mt-2 text-success";
                message.textContent = tr("jsonExported");
            }
            return;
        }
        const presetCard = event.target.closest(".preset-card");
        if (presetCard) {
            const preset = state.presets.find((item) => item.id === presetCard.dataset.presetId);
            if (preset) openEditor(preset);
            return;
        }
        const action = event.target.closest("[data-action]");
        if (action?.dataset.action === "random-fill") fillRandomDefaults(Number(action.dataset.bossIndex));
        if (action?.dataset.action === "clear-roster") {
            state.bosses[Number(action.dataset.bossIndex)].slots = Array(40).fill(null);
            saveAndRender();
        }
        const slot = event.target.closest(".roster-slot");
        if (slot && state.bosses[Number(slot.dataset.bossIndex)].slots[Number(slot.dataset.slotIndex)]) {
            state.bosses[Number(slot.dataset.bossIndex)].slots[Number(slot.dataset.slotIndex)] = null;
            saveAndRender();
        }
    });
    document.addEventListener("change", (event) => {
        if (!event.target.dataset.bossField) return;
        const boss = state.bosses[Number(event.target.dataset.bossIndex)];
        boss[event.target.dataset.bossField] = event.target.dataset.bossField === "randomCount"
            ? Number(event.target.value) : event.target.value;
        saveState();
    });
}

function init() {
    state = loadState();
    document.getElementById("startLevel").value = state.settings.startLevel;
    document.getElementById("maxLevel").value = state.settings.maxLevel;
    document.getElementById("timeLimit").value = state.settings.timeLimitMinutes;
    bindPageEvents();
    updateStaticTranslations();
    saveAndRender();
    window.i18next?.on("languageChanged", () => {
        const editorScroll = document.querySelector(".editor-body")?.scrollTop || 0;
        const jsonText = document.getElementById("editorJson")?.value;
        updateStaticTranslations();
        renderPresetGroups();
        renderBosses();
        renderCombinedResult();
        if (editorDraft) {
            renderEditor(editorScroll);
            if (jsonText != null) document.getElementById("editorJson").value = jsonText;
        }
        setTimeout(() => {
            document.title = tr("title");
        }, 0);
    });
}

window.addEventListener("beforeunload", () => workers.forEach((worker) => worker?.terminate()));
window.addEventListener("DOMContentLoaded", init);
