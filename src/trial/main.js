import abilitiesMap from "../combatsimulator/data/abilityDetailMap.json";
import comparatorsMap from "../combatsimulator/data/combatTriggerComparatorDetailMap.json";
import conditionsMap from "../combatsimulator/data/combatTriggerConditionDetailMap.json";
import dependenciesMap from "../combatsimulator/data/combatTriggerDependencyDetailMap.json";
import itemsMap from "../combatsimulator/data/itemDetailMap.json";
import solver from "javascript-lp-solver";
import apiAllocationScoreData from "./apiAllocationScoreData.json";

const STORAGE_KEY = "mwi-guild-trial-layout-v3";
const OLD_STORAGE_KEY = "mwi-guild-trial-layout-v2";
const MAX_TRIGGERS = 4;
const MIN_ROSTER_LIMIT = 1;
const MAX_ROSTER_LIMIT = 120;
const clone = (value) => JSON.parse(JSON.stringify(value));
const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const LEGACY_API_SOURCE = ["w", "v"].join("");
const IMPORTANCE_COVERAGE_DECAY = 0.5;
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
        rosterLimit: "阵容人数上限", reviewedPresets: "Reviewed 预设",
        fixedPresets: "固定预设", addFixedPreset: "添加固定预设", defaultPresets: "默认预设", addDefaultPreset: "添加默认预设",
        bulkDeletePresets: "批量删除预设", clearInsanityRevive: "清除疯狂/复活/无敌", selectAllPresets: "全选", clearSelectedPresets: "清空选择",
        deleteSelectedPresets: "删除选中预设", cancelBulkDelete: "取消批量删除",
        bulkDeleteHint: "已选择 {count} 个预设。删除会同步清空阵容里的引用。",
        confirmBulkDelete: "确认删除选中的 {count} 个预设吗？",
        startSimulation: "开始模拟", running: "模拟中…", combinedPoints: "合计积分：{value}",
        fixed: "固定", default: "默认", reviewed: "Reviewed", noWeapon: "未装备武器", noPresets: "暂无{type}预设",
        presetHint: "点击编辑；右键复制或删除；拖动到阵容", copyPreset: "复制预设", deletePreset: "删除预设", copySuffix: "副本",
        boss: "Boss {number}", randomDefaultCount: "随机默认预设数", fill: "填充", clear: "清空",
        assigned: "已分配 {count}/{total}", rosterHint: "拖入预设；点击格子移除", emptySlot: "空阵容格",
        simulationStats: "模拟统计", layers: "通过层数", reachedLevel: "到达等级", points: "基础积分",
        participants: "参战人数", duration: "模拟时间", minutes: "{value} 分钟", totalDamage: "总伤害",
        endReason: "结束原因", remainingHp: "当前怪物剩余生命", preset: "预设", count: "人数", alive: "存活",
        damage: "伤害", averageDamage: "平均伤害", healing: "治疗输出", restored: "获得回复", oom: "平均缺蓝", deaths: "死亡次数", noStats: "没有统计数据",
        sortAscending: "升序", sortDescending: "降序",
        progress: "当前等级 {level}，已通过 {layers} 层", presetName: "预设名称", levels: "等级", equipment: "装备",
        abilities: "技能与触发器", specialAbility: "特殊技能", abilitySlot: "技能槽", abilityLevel: "技能等级", triggers: "触发器",
        moveUp: "上移", moveDown: "下移",
        baselineAblation: "Baseline 消融", ablationMode: "消融方案", ablationModeIncrement: "增量消融", ablationModeReduction: "减量消融",
        ablationBoss: "消融目标", leftBoss: "左边 Boss", rightBoss: "右边 Boss",
        storeBaseline: "存入 baseline", runAblation: "开始消融", ablationRuns: "每项模拟次数", ablationConcurrency: "并行数",
        ablationIncrements: "增量预设", ablationReductions: "减量预设", baselineSaved: "已保存 baseline：{boss}，{count} 人。",
        noBaseline: "请先存入 baseline。", noAblationPresets: "请选择至少一个消融预设。",
        noReductionPresets: "当前 baseline 中没有可减量的预设。",
        baselineFull: "baseline 已达到阵容人数上限，无法追加增量预设。", ablationRunning: "消融运行中…",
        ablationBaselineLabel: "Baseline",
        ablationProgress: "{label} 已完成 {run}/{runs} 次，总进度 {done}/{total}",
        baselineAverage: "Baseline 平均总伤害", variantAverage: "方案平均总伤害", damageDiff: "差异", damageDiffPercent: "差异比例",
        ablationPreset: "消融预设", ablationNoResults: "暂无消融结果", ablationFailed: "消融失败：{message}",
        apiAllocation: "自动分配", apiAllocate: "开始自动分配", apiApplyAllocation: "应用到当前阵容",
        allocationRunning: "自动分配运行中…", allocationProgressPreparing: "准备候选", allocationProgressSolving: "求解中",
        allocationProgressFinishing: "整理结果", allocationMissingScoreData: "当前 Boss 缺少分数配置：{bosses}",
        reviewedRequired: "请先从固定预设添加至少一个 Reviewed 预设。",
        diminishingPenalty: "收益递减惩罚", allocationScore: "分配评分", allocationNoResult: "暂无自动分配结果",
        allocationBoss: "目标 Boss", allocationPlayer: "Reviewed 预设", allocationTag: "职业 tag", allocationAura: "携带光环",
        allocationContribution: "贡献", allocationTagStats: "Tag 统计", allocationAuraStats: "光环统计",
        allocationFailed: "自动分配失败：{message}", allocationInfeasible: "没有找到满足约束的分配方案",
        allocationMissing: "缺少可行候选：{items}", allocationApplied: "已应用自动分配到当前阵容。",
        allocationHint: "沿用旧版分配：增量收益 + 折算后的封顶重要性 + 真实光环强度比；重要性覆盖生存线后不再追加。",
        allocationConfig: "Boss 配置参数", allocationConfigHint: "这里配置每个 Boss 的生存线、必需光环、职业增量收益和重要性。重要性按默认职业预设数折算，并以 cover 封顶。",
        allocationSurvivalRules: "生存线 / 硬约束", allocationRequiredAuras: "必需光环", allocationRoleScores: "职业预设参数",
        allocationRuleName: "规则名", allocationRuleTags: "满足 tag（逗号分隔）", allocationRuleMin: "最少数量",
        allocationRoleTagName: "职业 tag", allocationGain: "增量收益", allocationImportance: "重要性",
        addAllocationRule: "添加规则", addAllocationRoleScore: "添加职业参数", importAblationAllocationConfig: "导入消融数据",
        saveAllocationConfig: "保存配置", allocationConfigSaved: "Boss 配置参数已保存。", allocationConfigImported: "已导入 {count} 条消融数据到 {boss}。",
        allocationConfigTransfer: "导入/导出 Boss 参数", allocationConfigTransferHint: "导出会把当前 Boss 配置参数压缩到下面文本框；导入时粘贴文本后点击导入，会覆盖当前 Boss 配置。",
        allocationConfigTransferText: "Boss 参数文本", exportAllocationConfig: "生成导出文本", importAllocationConfig: "导入 Boss 参数",
        allocationConfigExported: "Boss 参数已导出，可直接粘贴保存。", allocationConfigTransferImported: "Boss 参数已导入。",
        allocationConfigTransferFailed: "Boss 参数导入/导出失败：{message}",
        delete: "删除",
        insanityReviveAssignment: "疯狂/复活补位", insanityWeight: "疯狂权重", reviveWeight: "复活权重",
        shieldUsesInvincible: "盾用无敌替代",
        assignInsanityRevive: "按当前结果分配", insanityReviveAssigned: "已分配疯狂/复活：{count} 个预设。",
        insanityReviveCleared: "已清除疯狂/复活/无敌：{count} 个预设。", insanityReviveNeedResults: "请先完成两个 Boss 的模拟结果。",
        tagEditorTitle: "Reviewed Tag", tagEditorHint: "勾选默认预设中的 tag；自动分配只使用 Reviewed 预设上的 tag。",
        addToReviewed: "加入/更新 Reviewed", reviewedUpdated: "已加入或更新 Reviewed 预设。", noDefaultTagsForEditor: "暂无默认预设 tag 可选。",
        sourceChanged: "源预设已变化，请检查 Reviewed 是否需要更新", noLoadout: "无配装",
        noneText: "无",
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
        patchNotes: "更新日志", close: "关闭",
        importApiBuilds: "从 API 导入配装", importingApiBuilds: "导入中…",
        importedApiBuilds: "已导入 {count} 个 API 战斗配装。",
        apiBuildImportFailed: "从 API 导入配装失败：{message}",
        missingApiLoadout: "没有找到可用的战斗配装",
        apiImportTitle: "从 API 导入配装", apiUrl: "API 地址", apiUrlHint: "API 地址只用于本次读取，不会写入页面缓存、完整预设导出或 localStorage。读取成功后会清空输入框；API 返回内容会暂存在当前页面内存中供导出当前安排 JSON 使用。",
        apiFetch: "读取 API", apiUrlRequired: "请输入 API 地址。",
        presetTransfer: "导入/导出完整预设", compressedPresets: "压缩预设文本",
        exportCompressedPresets: "生成导出文本", importCompressedPresets: "导入压缩文本",
        compressedPresetHint: "导出会把当前页面的设置、全部预设和阵容压缩到下面文本框；导入时粘贴文本后点击导入。",
        compressedPresetExported: "已生成压缩文本，请复制文本框内容。",
        compressedPresetImported: "已导入压缩预设。",
        compressedPresetFailed: "压缩预设处理失败：{message}",
        abExport: "导出当前安排 JSON", abExportHint: "根据当前两个 Boss 阵容生成当前安排 JSON；无法识别角色 ID 的条目会列在下面。若已读取过 API，会直接复用当前页面内存缓存。",
        abExportReadable: "可识别安排 JSON", abExportUnreadable: "需手动处理的条目",
        exportAbAssignments: "生成当前安排 JSON", mergeAbManualAssignments: "合并手动条目到上方",
        abExported: "已生成 {count} 条可识别安排，{missing} 条需手动处理。", abManualMerged: "已合并 {count} 条手动条目。",
        abExportFailed: "安排 JSON 导出失败：{message}",
        ownedOptions: "★ 已拥有", allOptions: "全部",
        update20260720Title: "2026.7.20更新：",
        update20260720ApiImport: "新增从 API 导入配装：API 地址只用于本次读取，不写入 localStorage 或完整预设导出；API 预设以金色显示，复制后转为普通固定预设。",
        update20260720Allocation: "新增自动分配与 Boss 配置参数弹窗，可编辑生存线、必需光环、职业增量收益和封顶重要性；默认不再内置 Boss 配置。",
        update20260720AssignmentJson: "新增导出当前安排 JSON，可基于当前两个 Boss 阵容生成安排信息，并复用本页内存中的 API 数据识别角色。",
        update20260717Title: "2026.7.17更新：",
        update20260717PresetTransfer: "新增完整预设导入/导出，可用压缩文本备份和恢复当前设置、全部预设与阵容。",
        update20260717Editor: "预设编辑弹窗支持点击外侧区域关闭。",
        update20260717Badger: "试炼獾遭遇改为两只试炼獾。",
        update20260716Title: "2026.7.16更新：",
        update20260716Content: "在队伍中，较弱玩家的光环或减益不再覆盖较强的效果。同一增益会以当前最强的来源生效，该来源到期后由次强的接替。",
        update20260710Title: "2026.7.10更新：",
        update20260710Architecture: "公会试炼模拟器架构设计；",
        update20260710Regen: "禁用食物饮料，改为3%自动回血回蓝；",
        update20260710Parry: "君王剑格挡允许单次攻击最多判定5次；",
    },
    en: {
        title: "MWI Guild Combat Trial Simulator", startLevel: "Start Level", maxLevel: "Max Level", timeLimit: "Time Limit (minutes)",
        rosterLimit: "Roster Limit", reviewedPresets: "Reviewed Presets",
        fixedPresets: "Fixed Presets", addFixedPreset: "Add Fixed Preset", defaultPresets: "Default Presets", addDefaultPreset: "Add Default Preset",
        bulkDeletePresets: "Bulk Delete Presets", clearInsanityRevive: "Clear Insanity/Revive/Invincible", selectAllPresets: "Select All", clearSelectedPresets: "Clear Selection",
        deleteSelectedPresets: "Delete Selected Presets", cancelBulkDelete: "Cancel Bulk Delete",
        bulkDeleteHint: "{count} presets selected. Deleting also clears roster references.",
        confirmBulkDelete: "Delete the selected {count} presets?",
        startSimulation: "Start Simulation", running: "Simulating…", combinedPoints: "Total Points: {value}",
        fixed: "Fixed", default: "Default", reviewed: "Reviewed", noWeapon: "No weapon", noPresets: "No {type} presets",
        presetHint: "Click to edit; right-click to copy or delete; drag into a roster", copyPreset: "Copy Preset", deletePreset: "Delete Preset", copySuffix: "Copy",
        boss: "Boss {number}", randomDefaultCount: "Random Default Presets", fill: "Fill", clear: "Clear",
        assigned: "Assigned {count}/{total}", rosterHint: "Drag in a preset; click a slot to remove it", emptySlot: "Empty roster slot",
        simulationStats: "Simulation Statistics", layers: "Layers Cleared", reachedLevel: "Level Reached", points: "Base Points",
        participants: "Participants", duration: "Simulation Time", minutes: "{value} minutes", totalDamage: "Total Damage",
        endReason: "End Reason", remainingHp: "Remaining Enemy HP", preset: "Preset", count: "Count", alive: "Alive",
        damage: "Damage", averageDamage: "Average Damage", healing: "Healing Done", restored: "HP Restored", oom: "Average OOM", deaths: "Deaths", noStats: "No statistics",
        sortAscending: "Ascending", sortDescending: "Descending",
        progress: "Level {level}, {layers} layers cleared", presetName: "Preset Name", levels: "Levels", equipment: "Equipment",
        abilities: "Abilities & Triggers", specialAbility: "Special Ability", abilitySlot: "Ability Slot", abilityLevel: "Ability Level", triggers: "Triggers",
        moveUp: "Move Up", moveDown: "Move Down",
        baselineAblation: "Baseline Ablation", ablationMode: "Ablation Mode", ablationModeIncrement: "Increment Ablation", ablationModeReduction: "Reduction Ablation",
        ablationBoss: "Ablation Target", leftBoss: "Left Boss", rightBoss: "Right Boss",
        storeBaseline: "Store Baseline", runAblation: "Run Ablation", ablationRuns: "Runs Per Item", ablationConcurrency: "Concurrency",
        ablationIncrements: "Increment Presets", ablationReductions: "Reduction Presets", baselineSaved: "Baseline saved: {boss}, {count} combatants.",
        noBaseline: "Store a baseline first.", noAblationPresets: "Select at least one ablation preset.",
        noReductionPresets: "The current baseline has no presets available for reduction.",
        baselineFull: "Baseline already reached the roster limit; cannot add an increment preset.", ablationRunning: "Running ablation…",
        ablationBaselineLabel: "Baseline",
        ablationProgress: "{label} completed {run}/{runs}, total progress {done}/{total}",
        baselineAverage: "Baseline Average Damage", variantAverage: "Variant Average Damage", damageDiff: "Difference", damageDiffPercent: "Difference %",
        ablationPreset: "Ablation Preset", ablationNoResults: "No ablation results yet", ablationFailed: "Ablation failed: {message}",
        apiAllocation: "Auto Allocation", apiAllocate: "Run Auto Allocation", apiApplyAllocation: "Apply to Rosters",
        allocationRunning: "Running allocation…", allocationProgressPreparing: "Preparing candidates", allocationProgressSolving: "Solving",
        allocationProgressFinishing: "Preparing result", allocationMissingScoreData: "Missing score data for current bosses: {bosses}",
        reviewedRequired: "Add at least one Reviewed preset from fixed presets first.",
        diminishingPenalty: "Diminishing Return Penalty", allocationScore: "Allocation Score", allocationNoResult: "No allocation result yet",
        allocationBoss: "Target Boss", allocationPlayer: "Reviewed Preset", allocationTag: "Role Tag", allocationAura: "Aura",
        allocationContribution: "Contribution", allocationTagStats: "Tag Stats", allocationAuraStats: "Aura Stats",
        allocationFailed: "Auto allocation failed: {message}", allocationInfeasible: "No allocation satisfies the constraints",
        allocationMissing: "Missing feasible candidates: {items}", allocationApplied: "Auto allocation applied to current rosters.",
        allocationHint: "Legacy-style allocation: increment gain + capped importance after divisor + real aura strength ratio. Importance stops after survival coverage.",
        allocationConfig: "Boss Config", allocationConfigHint: "Configure survival constraints, required auras, role gain, and importance. Importance is divided by default role preset count and capped by cover variables.",
        allocationSurvivalRules: "Survival / Hard Constraints", allocationRequiredAuras: "Required Auras", allocationRoleScores: "Role Parameters",
        allocationRuleName: "Rule Name", allocationRuleTags: "Matching Tags (comma-separated)", allocationRuleMin: "Minimum Count",
        allocationRoleTagName: "Role Tag", allocationGain: "Gain", allocationImportance: "Importance",
        addAllocationRule: "Add Rule", addAllocationRoleScore: "Add Role Parameter", importAblationAllocationConfig: "Import Ablation Data",
        saveAllocationConfig: "Save Config", allocationConfigSaved: "Boss config saved.", allocationConfigImported: "Imported {count} ablation rows into {boss}.",
        allocationConfigTransfer: "Import/Export Boss Config", allocationConfigTransferHint: "Export compresses the current boss config into the text box below. Paste a text and import to overwrite the current boss config.",
        allocationConfigTransferText: "Boss Config Text", exportAllocationConfig: "Generate Export Text", importAllocationConfig: "Import Boss Config",
        allocationConfigExported: "Boss config exported. You can copy and save it.", allocationConfigTransferImported: "Boss config imported.",
        allocationConfigTransferFailed: "Boss config import/export failed: {message}",
        delete: "Delete",
        insanityReviveAssignment: "Insanity/Revive Assignment", insanityWeight: "Insanity Weight", reviveWeight: "Revive Weight",
        shieldUsesInvincible: "Use Invincible for shields",
        assignInsanityRevive: "Assign From Current Results", insanityReviveAssigned: "Assigned Insanity/Revive to {count} presets.",
        insanityReviveCleared: "Cleared Insanity/Revive/Invincible from {count} presets.", insanityReviveNeedResults: "Run both boss simulations first.",
        tagEditorTitle: "Reviewed Tags", tagEditorHint: "Check tags from default presets. Auto allocation only uses tags on Reviewed presets.",
        addToReviewed: "Add/Update Reviewed", reviewedUpdated: "Reviewed preset added or updated.", noDefaultTagsForEditor: "No default preset tags available.",
        sourceChanged: "Source preset changed; check whether Reviewed needs an update", noLoadout: "No Loadout",
        noneText: "None",
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
        patchNotes: "Patch Notes", close: "Close",
        importApiBuilds: "Import API Builds", importingApiBuilds: "Importing…",
        importedApiBuilds: "Imported {count} API combat builds.",
        apiBuildImportFailed: "Failed to import API builds: {message}",
        missingApiLoadout: "No usable combat loadout found",
        apiImportTitle: "Import Builds From API", apiUrl: "API URL", apiUrlHint: "The API URL is only used for this request. It is not written to page cache, full preset export, or localStorage. The input is cleared after a successful fetch; the API response is cached in current page memory for current assignment JSON export.",
        apiFetch: "Fetch API", apiUrlRequired: "Enter an API URL.",
        presetTransfer: "Import/Export Full Presets", compressedPresets: "Compressed Preset Text",
        exportCompressedPresets: "Generate Export Text", importCompressedPresets: "Import Compressed Text",
        compressedPresetHint: "Export compresses current settings, all presets, and rosters into the text box. Paste text here and import to restore.",
        compressedPresetExported: "Compressed text generated. Copy it from the text box.",
        compressedPresetImported: "Compressed presets imported.",
        compressedPresetFailed: "Compressed preset failed: {message}",
        abExport: "Export Current Assignment JSON", abExportHint: "Generate the current assignment JSON from the current two boss rosters. Entries whose character ID cannot be inferred are listed separately. If API data was already fetched, the in-memory page cache is reused.",
        abExportReadable: "Readable Assignment JSON", abExportUnreadable: "Manual Review Items",
        exportAbAssignments: "Generate Current Assignment JSON", mergeAbManualAssignments: "Merge Manual Items Up",
        abExported: "Generated {count} readable assignments and {missing} manual-review items.", abManualMerged: "Merged {count} manual items.",
        abExportFailed: "Assignment JSON export failed: {message}",
        ownedOptions: "★ Owned", allOptions: "All",
        update20260720Title: "2026.7.20 Update:",
        update20260720ApiImport: "Added API build import: API URLs are only used for the current fetch and are not written to localStorage or full preset exports. API presets are shown in gold, and copied API presets become regular fixed presets.",
        update20260720Allocation: "Added auto allocation and the Boss config modal for editing survival lines, required auras, role gain, and capped importance. Boss configs are no longer prefilled by default.",
        update20260720AssignmentJson: "Added current assignment JSON export, generated from the current two boss rosters and using in-memory API data to resolve characters.",
        update20260717Title: "2026.7.17 Update:",
        update20260717PresetTransfer: "Added full preset import/export with compressed text for backing up and restoring settings, presets, and rosters.",
        update20260717Editor: "Preset editor can now be closed by clicking outside the dialog.",
        update20260717Badger: "Trial Badger encounter now spawns two Trial Badgers.",
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

function clampRosterLimit(value) {
    return Math.min(MAX_ROSTER_LIMIT, Math.max(MIN_ROSTER_LIMIT, Math.floor(Number(value) || 40)));
}

function resizeSlots(slots, limit) {
    return [...(slots || []), ...Array(limit).fill(null)].slice(0, limit);
}

function updateRosterLimit(limit) {
    state.settings.rosterLimit = clampRosterLimit(limit);
    state.bosses.forEach((boss) => {
        boss.slots = resizeSlots(boss.slots, state.settings.rosterLimit);
        boss.result = null;
        boss.progress = null;
    });
}

function stopDragAutoScroll() {
    dragScrollState.active = false;
    dragScrollState.lastFrameTime = null;
    if (dragScrollState.frame) {
        cancelAnimationFrame(dragScrollState.frame);
        dragScrollState.frame = null;
    }
}

function tickDragAutoScroll(timestamp) {
    if (!dragScrollState.active) return;
    const edgeSize = 150;
    const fullScrollMs = 2000;
    const elapsed = Math.min(50, Math.max(16, timestamp - (dragScrollState.lastFrameTime || timestamp)));
    dragScrollState.lastFrameTime = timestamp;
    const scrollableDistance = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const maxStep = (scrollableDistance / fullScrollMs) * elapsed;
    let intensity = 0;
    if (dragScrollState.y < edgeSize) {
        intensity = -(1 - dragScrollState.y / edgeSize);
    } else if (dragScrollState.y > window.innerHeight - edgeSize) {
        intensity = 1 - (window.innerHeight - dragScrollState.y) / edgeSize;
    }
    if (intensity) window.scrollBy(0, maxStep * intensity);
    dragScrollState.frame = requestAnimationFrame(tickDragAutoScroll);
}

function updateDragAutoScroll(clientY) {
    dragScrollState.y = clientY;
    if (!dragScrollState.active) {
        dragScrollState.active = true;
        dragScrollState.lastFrameTime = null;
        dragScrollState.frame = requestAnimationFrame(tickDragAutoScroll);
    }
}

function defaultAblationConcurrency() {
    return Math.min(6, Math.max(2, (navigator.hardwareConcurrency || 4) - 1));
}

let state;
let editingId = null;
let editorDraft = null;
let isRunning = false;
let ablationState = {
    mode: "increment",
    targetBossIndex: 0,
    runs: 3,
    concurrency: defaultAblationConcurrency(),
    selectedPresetIds: [],
    baseline: null,
    progress: null,
    results: [],
    error: "",
    isRunning: false,
};
let allocationState = {
    diminishingPenalty: 0.8,
    result: null,
    progress: null,
    error: "",
    message: "",
    isRunning: false,
};
let insanityReviveState = {
    insanityWeight: 0.5,
    reviveWeight: 0.5,
    shieldUsesInvincible: false,
    error: "",
    message: "",
};
let bulkDeleteState = {
    enabled: false,
    selectedIds: [],
    lastSelectedId: null,
};
let dragScrollState = {
    active: false,
    y: 0,
    frame: null,
    lastFrameTime: null,
};
let allocationWorker = null;
let apiPayloadCache = null;
let apiModalAction = "import";
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

function levelMapFromCharacter(characterData) {
    return Object.fromEntries((characterData.characterSkills || [])
        .map((skill) => [skill.skillHrid, Number(skill.level) || 1]));
}

function abilityLevelMapFromCharacter(characterData) {
    return (characterData.characterAbilities || []).reduce((map, ability) => {
        map[ability.abilityHrid] = Math.max(map[ability.abilityHrid] || 1, Number(ability.level) || 1);
        return map;
    }, {});
}

function itemMapFromCharacter(characterData) {
    return Object.fromEntries((characterData.characterItems || [])
        .filter((item) => item.hash)
        .map((item) => [item.hash, item]));
}

function isRefinedItemHrid(itemHrid) {
    const text = String(itemHrid || "").toLowerCase();
    return /_(refined|star|stellar|starlight)(_|$)/.test(text);
}

function compareEquipmentOptions(a, b) {
    const aDetail = itemsMap[a.itemHrid] || {};
    const bDetail = itemsMap[b.itemHrid] || {};
    return (Number(bDetail.itemLevel) || 0) - (Number(aDetail.itemLevel) || 0)
        || (isRefinedItemHrid(b.itemHrid) ? 1 : 0) - (isRefinedItemHrid(a.itemHrid) ? 1 : 0)
        || (Number(b.enhancementLevel) || 0) - (Number(a.enhancementLevel) || 0)
        || (Number(bDetail.sortIndex) || 0) - (Number(aDetail.sortIndex) || 0);
}

function apiEquipmentOptionsBySlot(characterData) {
    const options = {};
    for (const [slot] of slots) {
        options[slot] = [];
    }
    for (const item of characterData.characterItems || []) {
        const detail = itemsMap[item.itemHrid];
        const slot = detail?.equipmentDetail?.type?.replace("/equipment_types/", "");
        // Equipped items may omit count or report 0; treat missing count as owned.
        if (!options[slot] || (item.count != null && Number(item.count) <= 0)) {
            continue;
        }
        const existing = options[slot].find((option) => option.itemHrid === item.itemHrid);
        const enhancementLevel = Number(item.enhancementLevel) || 0;
        if (existing) {
            existing.enhancementLevel = Math.max(existing.enhancementLevel, enhancementLevel);
        } else {
            options[slot].push({ itemHrid: item.itemHrid, enhancementLevel });
        }
    }
    Object.values(options).forEach((slotOptions) => slotOptions.sort(compareEquipmentOptions));
    return options;
}

function apiAbilityOptions(characterData) {
    return Object.entries(abilityLevelMapFromCharacter(characterData))
        .map(([abilityHrid, level]) => ({ abilityHrid, level }))
        .filter((option) => abilitiesMap[option.abilityHrid])
        .sort((a, b) => localizedName("abilityNames", abilitiesMap[a.abilityHrid])
            .localeCompare(localizedName("abilityNames", abilitiesMap[b.abilityHrid]), "zh-CN"));
}

function apiConstraintsFromCharacter(characterData) {
    return {
        equipmentBySlot: apiEquipmentOptionsBySlot(characterData),
        abilities: apiAbilityOptions(characterData),
    };
}

function itemFromWearableHash(hash, itemsByHash) {
    if (!hash) return null;
    const item = itemsByHash[hash];
    if (item) {
        return {
            itemHrid: item.itemHrid,
            enhancementLevel: Number(item.enhancementLevel) || 0,
        };
    }
    const [, , itemHrid, enhancementLevel] = String(hash).split("::");
    return itemHrid ? { itemHrid, enhancementLevel: Number(enhancementLevel) || 0 } : null;
}

function equipmentFromLoadoutSlot(slot, loadout, itemsByHash, constraints) {
    const hash = loadout.wearableMap?.[`/item_locations/${slot}`];
    if (!hash) return null;
    const item = itemFromWearableHash(hash, itemsByHash);
    const slotOptions = constraints.equipmentBySlot?.[slot] || [];
    const ownedItem = item ? slotOptions.find((option) => option.itemHrid === item.itemHrid) : null;
    const selected = ownedItem || slotOptions[0];
    return selected ? {
        itemLocationHrid: `/item_locations/${slot}`,
        itemHrid: selected.itemHrid,
        enhancementLevel: Number(selected.enhancementLevel) || 0,
    } : null;
}

function selectCombatLoadout(characterData) {
    const loadouts = Object.values(characterData.characterLoadoutMap || {})
        .filter(Boolean)
        .sort((a, b) => Number(a.ordinal || 0) - Number(b.ordinal || 0));
    const combatLoadouts = loadouts.filter((loadout) => loadout.actionTypeHrid === "/action_types/combat");
    const allActionLoadouts = loadouts.filter((loadout) =>
        !loadout.actionTypeHrid
        || loadout.actionTypeHrid === "/action_types/all"
        || loadout.actionTypeHrid === "/action_types/all_actions"
        || loadout.actionTypeHrid === "/action_types/any");
    return combatLoadouts.find((loadout) => loadout.isDefault)
        || combatLoadouts[0]
        || allActionLoadouts.find((loadout) => loadout.isDefault)
        || allActionLoadouts[0]
        || loadouts.find((loadout) => loadout.isDefault)
        || loadouts[0]
        || null;
}

function normalizeTriggerMap(triggerMap, abilityHrids) {
    const normalized = {};
    for (const abilityHrid of abilityHrids.filter(Boolean)) {
        normalized[abilityHrid] = (triggerMap?.[abilityHrid] || [])
            .filter(Boolean)
            .slice(0, MAX_TRIGGERS)
            .map((trigger) => ({
                dependencyHrid: trigger.dependencyHrid,
                conditionHrid: trigger.conditionHrid,
                comparatorHrid: trigger.comparatorHrid,
                value: Number(trigger.value) || 0,
            }));
    }
    return normalized;
}

function buildFromApiCharacter(characterData) {
    const loadout = selectCombatLoadout(characterData);
    const skillLevels = levelMapFromCharacter(characterData);
    const abilityLevels = abilityLevelMapFromCharacter(characterData);
    const itemsByHash = itemMapFromCharacter(characterData);
    const constraints = apiConstraintsFromCharacter(characterData);
    const fallbackAbilities = constraints.abilities
        .filter((ability) => !abilitiesMap[ability.abilityHrid]?.isSpecialAbility)
        .slice(0, 4)
        .map((ability) => ability.abilityHrid);
    const fallbackSpecial = constraints.abilities
        .find((ability) => abilitiesMap[ability.abilityHrid]?.isSpecialAbility)?.abilityHrid || "";
    const abilityHrids = loadout
        ? [1, 2, 3, 4, 5].map((slot) => loadout.abilityMap?.[String(slot)] || "")
        : [fallbackSpecial, ...fallbackAbilities];
    const build = defaultBuild();
    build.player = {
        staminaLevel: skillLevels["/skills/stamina"] || 1,
        intelligenceLevel: skillLevels["/skills/intelligence"] || 1,
        attackLevel: skillLevels["/skills/attack"] || 1,
        meleeLevel: skillLevels["/skills/melee"] || 1,
        defenseLevel: skillLevels["/skills/defense"] || 1,
        rangedLevel: skillLevels["/skills/ranged"] || 1,
        magicLevel: skillLevels["/skills/magic"] || 1,
        equipment: slots.flatMap(([slot]) => {
            const item = loadout
                ? equipmentFromLoadoutSlot(slot, loadout, itemsByHash, constraints)
                : (constraints.equipmentBySlot?.[slot]?.[0] ? {
                    itemLocationHrid: `/item_locations/${slot}`,
                    itemHrid: constraints.equipmentBySlot[slot][0].itemHrid,
                    enhancementLevel: Number(constraints.equipmentBySlot[slot][0].enhancementLevel) || 0,
                } : null);
            return item ? [item] : [];
        }),
    };
    build.food = { "/action_types/combat": loadout?.foodItemHrids || [] };
    build.drinks = { "/action_types/combat": loadout?.drinkItemHrids || [] };
    build.abilities = abilityHrids.map((abilityHrid) => ({
        abilityHrid,
        level: abilityHrid ? (abilityLevels[abilityHrid] || 1) : 1,
    }));
    build.triggerMap = normalizeTriggerMap(
        loadout?.abilityCombatTriggersMap || characterData.abilityCombatTriggersMap || {},
        abilityHrids
    );
    build.houseRooms = Object.fromEntries(Object.entries(characterData.characterHouseRoomMap || {})
        .map(([roomHrid, room]) => [roomHrid, Number(room?.level) || 0]));
    build.achievements = Object.fromEntries((characterData.characterAchievements || [])
        .map((achievement) => [achievement.achievementHrid, Boolean(achievement.isCompleted)]));
    return { build, constraints };
}

function apiPresetName(characterData, loadout) {
    const characterName = characterData.character?.name || characterData.characterInfo?.name || `#${characterData.character?.id || ""}`;
    return loadout?.name ? `${characterName} - ${loadout.name}` : `${characterName} - ${tr("noLoadout")}`;
}

function apiCharacterId(characterData) {
    return String(characterData.character?.id
        || characterData.character?.characterID
        || characterData.characterInfo?.id
        || characterData.characterInfo?.characterID
        || "");
}

function presetsFromApiPayload(payload) {
    if (!Array.isArray(payload)) {
        throw new Error(tr("missingApiLoadout"));
    }
    return payload.flatMap((characterData) => {
        const loadout = selectCombatLoadout(characterData);
        const apiPreset = buildFromApiCharacter(characterData);
        return apiPreset ? [{
            id: createId(),
            type: "fixed",
            source: "api",
            sourceCharacterId: apiCharacterId(characterData),
            name: apiPresetName(characterData, loadout),
            build: apiPreset.build,
            constraints: apiPreset.constraints,
        }] : [];
    });
}

function blankBoss(encounterHrid) {
    return {
        encounterHrid,
        slots: Array(state?.settings?.rosterLimit || 40).fill(null),
        randomCount: 1,
        result: null,
        progress: null,
    };
}

function normalizeAllocationNumberMap(map) {
    return Object.fromEntries(Object.entries(map || {})
        .map(([key, value]) => [String(key || "").trim(), Number(value) || 0])
        .filter(([key]) => key));
}

function normalizeAllocationConfig(config) {
    const source = config?.bosses ? config : apiAllocationScoreData;
    const defaultBosses = apiAllocationScoreData.bosses || {};
    const bossKeys = [...new Set([
        ...Object.keys(defaultBosses),
        ...Object.keys(source.bosses || {}),
    ])];
    return {
        bosses: Object.fromEntries(bossKeys.map((bossKey) => {
            const fallback = defaultBosses[bossKey] || {};
            const hasCustomBoss = Object.prototype.hasOwnProperty.call(source.bosses || {}, bossKey);
            const boss = hasCustomBoss ? (source.bosses?.[bossKey] || {}) : fallback;
            return [bossKey, {
                label: String(boss.label || fallback.label || bossKey),
                encounterHrid: String(boss.encounterHrid || fallback.encounterHrid || ""),
                survivalGroups: (Object.prototype.hasOwnProperty.call(boss, "survivalGroups") ? boss.survivalGroups : fallback.survivalGroups || []).map((group) => ({
                    name: String(group.name || ""),
                    tags: (Array.isArray(group.tags) ? group.tags : String(group.tags || "").split(","))
                        .map((tag) => String(tag || "").trim())
                        .filter(Boolean),
                    min: Math.max(0, Number(group.min) || 0),
                })).filter((group) => group.name || group.tags.length || group.min > 0),
                requiredAuras: (Array.isArray(boss.requiredAuras) ? boss.requiredAuras : fallback.requiredAuras || [])
                    .map((aura) => String(aura || "").trim())
                    .filter(Boolean),
                gain: normalizeAllocationNumberMap(Object.prototype.hasOwnProperty.call(boss, "gain") ? boss.gain : fallback.gain),
                importance: normalizeAllocationNumberMap(Object.prototype.hasOwnProperty.call(boss, "importance") ? boss.importance : fallback.importance),
            }];
        })),
    };
}

function normalizeState(saved) {
    const presets = (saved?.presets || []).map((preset) => ({
        ...preset,
        id: preset.id || createId(),
        type: preset.type === "default" ? "default" : preset.type === "reviewed" ? "reviewed" : "fixed",
        build: typeof preset.build === "string" ? JSON.parse(preset.build) : preset.build,
    }));
    presets.forEach(syncPresetToOwnedApiValues);
    presets
        .filter(isReviewedPreset)
        .forEach((preset) => {
            const source = presets.find((candidate) => candidate.id === preset.sourcePresetId);
            if (source?.source === "api" || source?.source === LEGACY_API_SOURCE) {
                preset.source = "api";
                preset.sourceCharacterId ||= source.sourceCharacterId;
                // Always refresh owned gear/skills from the live API source.
                if (source.constraints) preset.constraints = clone(source.constraints);
            }
        });
    presets.forEach((preset) => {
        if (preset.source === LEGACY_API_SOURCE) preset.source = "api";
    });
    presets.forEach(syncPresetToOwnedApiValues);
    if (!presets.some((preset) => preset.type === "fixed")) {
        presets.push(defaultPreset("fixed", tr("fixedPresets")));
    }
    if (!presets.some((preset) => preset.type === "default")) {
        presets.push(defaultPreset("default", tr("defaultPresets")));
    }
    const loadedBosses = saved?.bosses || [];
    const rosterLimit = clampRosterLimit(saved?.settings?.rosterLimit
        || Math.max(40, ...loadedBosses.map((boss) => boss?.slots?.length || 0)));
    return {
        settings: {
            startLevel: Number(saved?.settings?.startLevel) || 100,
            maxLevel: Number(saved?.settings?.maxLevel) || 300,
            timeLimitMinutes: Number(saved?.settings?.timeLimitMinutes) || 60,
            rosterLimit,
        },
        presets,
        allocationConfig: normalizeAllocationConfig(saved?.allocationConfig),
        bosses: [0, 1].map((index) => {
            const source = loadedBosses[index] || {};
            const sourceSlots = source.slots || [];
            return {
                encounterHrid: encounters[index][0],
                ...source,
                slots: resizeSlots(sourceSlots, rosterLimit),
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
        allocationConfig: state.allocationConfig,
        bosses: state.bosses.map(({ encounterHrid, slots, randomCount }) => ({
            encounterHrid, slots, randomCount,
        })),
    }));
}

function exportableState() {
    return {
        version: 1,
        settings: state.settings,
        presets: state.presets,
        allocationConfig: state.allocationConfig,
        bosses: state.bosses.map(({ encounterHrid, slots, randomCount }) => ({
            encounterHrid, slots, randomCount,
        })),
    };
}

function bytesToBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
    }
    return btoa(binary);
}

function base64ToBytes(base64) {
    const binary = atob(base64.replace(/\s+/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
}

async function compressText(text) {
    if (!window.CompressionStream) {
        throw new Error("CompressionStream is not supported by this browser.");
    }
    const stream = new Blob([new TextEncoder().encode(text)])
        .stream()
        .pipeThrough(new CompressionStream("gzip"));
    return bytesToBase64(new Uint8Array(await new Response(stream).arrayBuffer()));
}

async function decompressText(base64) {
    if (!window.DecompressionStream) {
        throw new Error("DecompressionStream is not supported by this browser.");
    }
    const stream = new Blob([base64ToBytes(base64)])
        .stream()
        .pipeThrough(new DecompressionStream("gzip"));
    return new TextDecoder().decode(await new Response(stream).arrayBuffer());
}

async function exportCompressedPresets() {
    const textarea = document.getElementById("presetTransferText");
    const message = document.getElementById("presetTransferMessage");
    try {
        textarea.value = await compressText(JSON.stringify(exportableState()));
        textarea.focus();
        textarea.select();
        await navigator.clipboard?.writeText(textarea.value).catch(() => {});
        message.className = "small mt-2 text-success";
        message.textContent = tr("compressedPresetExported");
    } catch (error) {
        message.className = "small mt-2 text-danger";
        message.textContent = tr("compressedPresetFailed", { message: error.message });
    }
}

async function importCompressedPresets() {
    const textarea = document.getElementById("presetTransferText");
    const message = document.getElementById("presetTransferMessage");
    try {
        const imported = JSON.parse(await decompressText(textarea.value));
        if (!Array.isArray(imported?.presets)) {
            throw new Error("Missing presets");
        }
        state = normalizeState(imported);
        saveAndRender();
        message.className = "small mt-2 text-success";
        message.textContent = tr("compressedPresetImported");
    } catch (error) {
        message.className = "small mt-2 text-danger";
        message.textContent = tr("compressedPresetFailed", { message: error.message });
    }
}

function guildCombatHridForEncounter(encounterHrid) {
    const key = String(encounterHrid || "").split("/").pop();
    return key ? `/guild_combat/${key}` : "";
}

function characterNameFromPresetName(name) {
    const text = String(name || "").trim();
    if (!text) return "";
    if (text.includes(" - ")) return text.split(" - ")[0].trim();
    if (text.includes("-公会试炼-")) return text.split("-公会试炼-")[0].trim();
    return text.split("-")[0].trim();
}

function buildApiCharacterIndexes(payload) {
    const root = Array.isArray(payload) ? payload[0] || {} : payload || {};
    const idsByName = new Map();
    const add = (id, name) => {
        const key = String(name || "").trim().toLowerCase();
        if (id && key && !idsByName.has(key)) idsByName.set(key, String(id));
    };
    for (const [id, character] of Object.entries(root.guildSharableCharacterMap || {})) {
        add(id, character?.name);
    }
    for (const entry of Array.isArray(payload) ? payload : []) {
        add(apiCharacterId(entry), entry.character?.name || entry.characterInfo?.name);
    }
    return { idsByName };
}

function resolvePresetCharacterId(preset, indexes, visited = new Set()) {
    if (!preset || visited.has(preset.id)) return "";
    visited.add(preset.id);
    if (preset.sourceCharacterId) return String(preset.sourceCharacterId);
    for (const sourceId of [preset.sourceReviewedId, preset.sourcePresetId]) {
        const source = state.presets.find((item) => item.id === sourceId);
        const resolved = resolvePresetCharacterId(source, indexes, visited);
        if (resolved) return resolved;
    }
    const nameId = indexes.idsByName.get(characterNameFromPresetName(preset.name).toLowerCase());
    return nameId || "";
}

function exportKeyNameForPreset(preset) {
    return characterNameFromPresetName(preset?.name) || preset?.name || "UNKNOWN";
}

function tagFromPresetName(preset) {
    const name = stripInsanityReviveSuffix(preset.name);
    const tags = defaultTagOptions().sort((a, b) => b.length - a.length);
    return tags.find((tag) => name.includes(tag)) || "";
}

function shortCombatLoadoutId(preset) {
    const specialHrid = preset.build?.abilities?.[0]?.abilityHrid || "";
    const specialName = preset.allocationAura || (specialHrid ? specialSuffixName(specialHrid) : "");
    const tag = preset.allocationTag || tagFromPresetName(preset);
    if (specialName && tag) return `${specialName}-${tag}`;
    if (tag) return tag;
    if (specialName) return specialName;
    const cleanName = stripInsanityReviveSuffix(preset.name);
    return cleanName.includes(" - ") ? cleanName.split(" - ").slice(1).join(" - ").trim() || cleanName : cleanName;
}

function currentAbAssignmentRows(indexes) {
    const rows = [];
    const usedKeys = new Set();
    state.bosses.forEach((boss) => {
        const combatTrialHrid = guildCombatHridForEncounter(boss.encounterHrid);
        boss.slots.filter(Boolean).forEach((presetId) => {
            const preset = state.presets.find((item) => item.id === presetId);
            if (!preset) {
                rows.push({ readable: false, key: "UNKNOWN", combatTrialHrid, combatLoadoutId: "" });
                return;
            }
            const combatLoadoutId = shortCombatLoadoutId(preset);
            const characterId = resolvePresetCharacterId(preset, indexes);
            const key = characterId || exportKeyNameForPreset(preset);
            const readable = Boolean(characterId);
            if (usedKeys.has(key)) {
                rows.push({ readable: false, key, combatTrialHrid, combatLoadoutId });
                return;
            }
            usedKeys.add(key);
            rows.push({ readable, key, combatTrialHrid, combatLoadoutId });
        });
    });
    return rows;
}

async function exportAbAssignments() {
    const readableTextarea = document.getElementById("abExportReadableText");
    const unreadableTextarea = document.getElementById("abExportUnreadableText");
    const message = document.getElementById("abExportMessage");
    message.className = "small mt-2 text-muted";
    message.textContent = tr("importingApiBuilds");
    try {
        if (!apiPayloadCache) {
            openApiImportModal("export");
            message.className = "small mt-2 text-muted";
            message.textContent = tr("apiUrlRequired");
            return;
        }
        const indexes = buildApiCharacterIndexes(apiPayloadCache);
        const rows = currentAbAssignmentRows(indexes);
        const readable = {};
        const unreadable = {};
        rows.forEach((row) => {
            const entry = {
                combatTrialHrid: row.combatTrialHrid,
                combatLoadoutId: row.combatLoadoutId,
            };
            if (row.readable) {
                readable[row.key] = entry;
            } else {
                unreadable[row.key] = entry;
            }
        });
        readableTextarea.value = JSON.stringify(readable, null, 2);
        unreadableTextarea.value = JSON.stringify(unreadable, null, 2);
        readableTextarea.focus();
        readableTextarea.select();
        await navigator.clipboard?.writeText(readableTextarea.value).catch(() => {});
        message.className = "small mt-2 text-success";
        message.textContent = tr("abExported", { count: Object.keys(readable).length, missing: Object.keys(unreadable).length });
    } catch (error) {
        message.className = "small mt-2 text-danger";
        message.textContent = tr("abExportFailed", { message: error.message });
    }
}

function mergeAbManualAssignments() {
    const readableTextarea = document.getElementById("abExportReadableText");
    const unreadableTextarea = document.getElementById("abExportUnreadableText");
    const message = document.getElementById("abExportMessage");
    try {
        const readable = JSON.parse(readableTextarea.value || "{}");
        const unreadable = JSON.parse(unreadableTextarea.value || "{}");
        const remaining = {};
        let moved = 0;
        for (const [key, value] of Object.entries(unreadable)) {
            const normalizedKey = String(key || "").trim();
            if (/^\d+$/.test(normalizedKey)) {
                readable[normalizedKey] = value;
                moved += 1;
            } else {
                remaining[key] = value;
            }
        }
        readableTextarea.value = JSON.stringify(readable, null, 2);
        unreadableTextarea.value = JSON.stringify(remaining, null, 2);
        message.className = "small mt-2 text-success";
        message.textContent = tr("abManualMerged", { count: moved });
    } catch (error) {
        message.className = "small mt-2 text-danger";
        message.textContent = tr("abExportFailed", { message: error.message });
    }
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

function isApiPreset(preset) {
    return preset?.source === "api" || preset?.source === LEGACY_API_SOURCE;
}

function isApiSourcePreset(preset) {
    return isApiPreset(preset) && preset?.type === "fixed" && !preset?.generatedFromAllocation;
}

function isReviewedPreset(preset) {
    return preset?.type === "reviewed";
}

function presetClassName(preset) {
    return `${preset?.type || ""} ${preset?.generatedFromAllocation ? "generated-fixed" : ""} ${isApiSourcePreset(preset) ? "api-fixed" : ""} ${isApiSourcePreset(preset) && reviewedForSource(preset.id) ? "api-reviewed-source" : ""} ${sourceReviewedIsStale(preset) ? "source-stale" : ""}`.trim();
}

function normalizedItemKey(itemHrid) {
    const ignoredParts = new Set(["refined", "star", "stellar", "starlight", "enhanced", "perfected", "superior", "inferior"]);
    return String(itemHrid || "")
        .split("/")
        .pop()
        .toLowerCase()
        .split("_")
        .filter((part) => !ignoredParts.has(part))
        .join("_");
}

function itemLevel(itemHrid) {
    return Number(itemsMap[itemHrid]?.itemLevel) || 0;
}

function apiAvailableEquipmentBySlot(preset) {
    const bySlot = {};
    for (const equipment of preset.build?.player?.equipment || []) {
        const slot = equipment.itemLocationHrid?.replace("/item_locations/", "");
        if (!slot) continue;
        bySlot[slot] ||= [];
        bySlot[slot].push(equipment);
    }
    for (const [slot, options] of Object.entries(preset.constraints?.equipmentBySlot || {})) {
        bySlot[slot] ||= [];
        bySlot[slot].push(...options);
    }
    return bySlot;
}

function presetAbilityLevels(preset) {
    const levels = {};
    for (const ability of [
        ...(preset.build?.abilities || []),
        ...(preset.constraints?.abilities || []),
    ]) {
        if (!ability.abilityHrid) continue;
        levels[ability.abilityHrid] = Math.max(levels[ability.abilityHrid] || 0, Number(ability.level) || 0);
    }
    return levels;
}

function ownedEquipmentForPresetSlot(preset, slot, itemHrid) {
    return (preset?.constraints?.equipmentBySlot?.[slot] || [])
        .filter((equipment) => equipment.itemHrid === itemHrid)
        .sort((a, b) => (Number(b.enhancementLevel) || 0) - (Number(a.enhancementLevel) || 0))[0] || null;
}

function ownedAbilityLevelForPreset(preset, abilityHrid) {
    return (preset?.constraints?.abilities || [])
        .filter((ability) => ability.abilityHrid === abilityHrid)
        .reduce((level, ability) => Math.max(level, Number(ability.level) || 0), 0);
}

function syncPresetToOwnedApiValues(preset) {
    if (!isApiPreset(preset) || !preset?.constraints || !preset?.build) return;
    for (const equipment of preset.build.player?.equipment || []) {
        const slot = equipmentSlot(equipment);
        const owned = ownedEquipmentForPresetSlot(preset, slot, equipment.itemHrid);
        if (owned) {
            equipment.enhancementLevel = Math.max(
                Number(equipment.enhancementLevel) || 0,
                Number(owned.enhancementLevel) || 0,
            );
        }
    }
    for (const ability of preset.build.abilities || []) {
        if (!ability.abilityHrid) continue;
        const ownedLevel = ownedAbilityLevelForPreset(preset, ability.abilityHrid);
        if (ownedLevel) ability.level = Math.max(Number(ability.level) || 1, ownedLevel);
    }
}

function mergeManualApiValues(importedPreset, previousPreset) {
    const merged = clone(importedPreset);
    for (const equipment of merged.build?.player?.equipment || []) {
        const previous = (previousPreset.build?.player?.equipment || []).find((item) =>
            equipmentSlot(item) === equipmentSlot(equipment) && item.itemHrid === equipment.itemHrid);
        if (previous) {
            equipment.enhancementLevel = Math.max(
                Number(equipment.enhancementLevel) || 0,
                Number(previous.enhancementLevel) || 0,
            );
        }
    }
    for (const ability of merged.build?.abilities || []) {
        if (!ability.abilityHrid) continue;
        const previous = (previousPreset.build?.abilities || []).find((item) => item.abilityHrid === ability.abilityHrid);
        if (previous) {
            ability.level = Math.max(Number(ability.level) || 1, Number(previous.level) || 1);
        }
    }
    return merged;
}

function requiredTagAbilityLevel(level) {
    return Math.ceil((Number(level) || 0) * 0.8);
}

function requiredSpecialTagAbilityLevel(ability) {
    if (ability?.abilityHrid?.endsWith("_aura")) {
        return Number(ability.level) || 0;
    }
    return requiredTagAbilityLevel(ability?.level);
}

function apiEquipmentMatchesRequirement(owned, required, { allowLevelUpgrade = true } = {}) {
    const requiredHrid = required.itemHrid;
    const ownedHrid = owned.itemHrid;
    if (!ownedHrid || !requiredHrid) return false;
    if ((Number(owned.enhancementLevel) || 0) < Math.ceil((Number(required.enhancementLevel) || 0) / 2)) return false;
    return ownedHrid === requiredHrid
        || normalizedItemKey(ownedHrid) === normalizedItemKey(requiredHrid)
        || (allowLevelUpgrade && itemLevel(ownedHrid) >= itemLevel(requiredHrid));
}

function firstPresetAbility(preset) {
    return (preset.build?.abilities || []).find((ability) => ability.abilityHrid);
}

function isSpecialTagAbility(ability) {
    return Boolean(ability?.abilityHrid?.endsWith("_aura")
        || ability?.abilityHrid === "/abilities/revive"
        || ability?.abilityHrid === "/abilities/insanity");
}

function defaultPresetMatchesApiPreset(defaultPreset, apiPreset) {
    if (isSpecialTagAbility(firstPresetAbility(defaultPreset))) {
        return specialPresetMatchesApiPreset(defaultPreset, apiPreset);
    }
    const abilityLevels = presetAbilityLevels(apiPreset);
    const requiredAbilities = (defaultPreset.build?.abilities || []).filter((ability) => ability.abilityHrid);
    if (!requiredAbilities.every((ability) => (abilityLevels[ability.abilityHrid] || 0) >= requiredTagAbilityLevel(ability.level))) {
        return false;
    }
    const requiredEquipment = defaultPreset.build?.player?.equipment || [];
    if (!requiredEquipment.length) return true;
    const availableEquipment = apiAvailableEquipmentBySlot(apiPreset);
    const requiredHardSlots = new Set(["body", "legs", "main_hand", "two_hand"]);
    const slotOfRequiredEquipment = (required) => required.itemLocationHrid?.replace("/item_locations/", "");
    const matchesRequiredEquipment = (required) => {
        const slot = slotOfRequiredEquipment(required);
        return slot && (availableEquipment[slot] || []).some((owned) =>
            apiEquipmentMatchesRequirement(owned, required, { allowLevelUpgrade: !requiredHardSlots.has(slot) }));
    };
    const matchesHardRequiredEquipment = (required) => {
        const slot = required.itemLocationHrid?.replace("/item_locations/", "");
        return slot && (availableEquipment[slot] || []).some((owned) =>
            apiEquipmentMatchesRequirement(owned, required, { allowLevelUpgrade: false }));
    };
    const hardRequirements = requiredEquipment.filter((required) =>
        requiredHardSlots.has(slotOfRequiredEquipment(required)));
    if (!hardRequirements.every(matchesHardRequiredEquipment)) {
        return false;
    }
    const matchedCount = requiredEquipment.filter(matchesRequiredEquipment).length;
    return matchedCount >= Math.ceil(requiredEquipment.length * 0.5);
}

function isSpecialTagPreset(preset) {
    if (preset.type !== "fixed" || isApiPreset(preset)) return false;
    return isSpecialTagAbility(firstPresetAbility(preset));
}

function specialPresetMatchesApiPreset(specialPreset, apiPreset) {
    const firstAbility = firstPresetAbility(specialPreset);
    if (!firstAbility) return false;
    return (presetAbilityLevels(apiPreset)[firstAbility.abilityHrid] || 0) >= requiredSpecialTagAbilityLevel(firstAbility);
}

function apiPresetTags(preset) {
    if (!isApiPreset(preset)) return [];
    return [...new Set(state.presets
        .filter((candidate) => candidate.type === "default")
        .filter((candidate) => defaultPresetMatchesApiPreset(candidate, preset))
        .map((candidate) => candidate.name))];
}

function textHash(text) {
    let hash = 0;
    for (let index = 0; index < text.length; index++) {
        hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
    }
    return String(hash >>> 0);
}

function sourceSnapshotHash(preset) {
    return textHash(JSON.stringify({
        name: preset?.name || "",
        build: preset?.build || null,
        constraints: preset?.constraints || null,
    }));
}

function reviewedForSource(sourcePresetId) {
    return state.presets.find((preset) => isReviewedPreset(preset) && preset.sourcePresetId === sourcePresetId);
}

function sourceReviewedIsStale(preset) {
    if (!preset || preset.type !== "fixed") return false;
    const reviewed = reviewedForSource(preset.id);
    return Boolean(reviewed && reviewed.sourceSnapshotHash !== sourceSnapshotHash(preset));
}

function automaticTagsForPreset(preset) {
    return isApiPreset(preset) && !isReviewedPreset(preset) ? apiPresetTags(preset) : [];
}

function editableTagsForPreset(preset) {
    if (isReviewedPreset(preset)) return preset.reviewedTags || [];
    return reviewedForSource(preset.id)?.reviewedTags || preset.reviewedTags || automaticTagsForPreset(preset);
}

function presetTagsForDisplay(preset) {
    return isReviewedPreset(preset) ? (preset.reviewedTags || []) : automaticTagsForPreset(preset);
}

function createReviewedPreset(sourcePreset, tags) {
    return {
        id: createId(),
        type: "reviewed",
        source: sourcePreset.source,
        sourceCharacterId: sourcePreset.sourceCharacterId,
        name: sourcePreset.name,
        sourcePresetId: sourcePreset.id,
        sourceSnapshotHash: sourceSnapshotHash(sourcePreset),
        reviewedTags: sanitizeReviewedTags(tags),
        build: clone(sourcePreset.build),
        constraints: sourcePreset.constraints ? clone(sourcePreset.constraints) : undefined,
    };
}

function defaultTagOptions() {
    return [...new Set(state.presets
        .filter((preset) => preset.type === "default")
        .map((preset) => preset.name)
        .filter(Boolean))];
}

function sanitizeReviewedTags(tags) {
    const allowedTags = new Set(defaultTagOptions());
    return [...new Set((tags || [])
        .map((tag) => String(tag || "").trim())
        .filter((tag) => tag && allowedTags.has(tag)))];
}

function reviewedTagsFromEditor() {
    return sanitizeReviewedTags([...document.querySelectorAll("[data-reviewed-tag]:checked")]
        .map((input) => input.dataset.reviewedTag));
}

function reviewedTagCheckboxesHtml(selectedTags) {
    const selected = new Set(sanitizeReviewedTags(selectedTags));
    const options = defaultTagOptions();
    if (!options.length) {
        return `<p class="small text-muted mb-0">${tr("noDefaultTagsForEditor")}</p>`;
    }
    return `<div class="tag-checkbox-grid">
        ${options.map((tag) => `
            <label class="form-check tag-checkbox">
                <input class="form-check-input" type="checkbox" data-reviewed-tag="${escapeHtml(tag)}" ${selected.has(tag) ? "checked" : ""}>
                <span class="form-check-label">${escapeHtml(tag)}</span>
            </label>
        `).join("")}
    </div>`;
}

function upsertReviewedFromEditor() {
    if (!editorDraft || editorDraft.type !== "fixed") return;
    const reviewedTags = reviewedTagsFromEditor();
    const sourceIndex = state.presets.findIndex((preset) => preset.id === editingId);
    if (sourceIndex >= 0) {
        state.presets[sourceIndex] = clone(editorDraft);
    }
    const source = state.presets[sourceIndex] || editorDraft;
    const existingIndex = state.presets.findIndex((preset) => isReviewedPreset(preset) && preset.sourcePresetId === source.id);
    const reviewed = createReviewedPreset(source, reviewedTags);
    if (existingIndex >= 0) {
        reviewed.id = state.presets[existingIndex].id;
        reviewed.reviewedTags = reviewedTags;
        state.presets[existingIndex] = reviewed;
    } else {
        state.presets.push(reviewed);
    }
    editorDraft.reviewedTags = reviewed.reviewedTags;
    saveAndRender();
    renderEditor(document.querySelector(".editor-body")?.scrollTop || 0);
    const message = document.getElementById("editorReviewedMessage");
    if (message) {
        message.className = "small mt-2 text-success";
        message.textContent = tr("reviewedUpdated");
    }
}

function setBuildEquipment(build, equipment) {
    const slot = equipmentSlot(equipment);
    if (!slot) return;
    build.player.equipment = (build.player.equipment || [])
        .filter((item) => equipmentSlot(item) !== slot);
    build.player.equipment.push({
        itemLocationHrid: `/item_locations/${slot}`,
        itemHrid: equipment.itemHrid,
        enhancementLevel: Number(equipment.enhancementLevel) || 0,
    });
    build.player.equipment = build.player.equipment
        .filter((item) => !conflictingEquipmentSlots(slot).includes(equipmentSlot(item)));
}

function equipmentTypeSlot(itemHrid) {
    return itemsMap[itemHrid]?.equipmentDetail?.type?.replace("/equipment_types/", "") || "";
}

function bestOwnedInItemFamily(candidates, requiredHrid) {
    const requiredKey = normalizedItemKey(requiredHrid);
    if (!requiredKey) return null;
    return candidates
        .filter((owned) => owned?.itemHrid && normalizedItemKey(owned.itemHrid) === requiredKey)
        .sort(compareEquipmentOptions)[0] || null;
}

function bestOwnedEquipmentForRequirement(sourcePreset, required) {
    const requiredHrid = required?.itemHrid;
    if (!requiredHrid) return null;
    const slot = equipmentSlot(required) || equipmentTypeSlot(requiredHrid);
    const bySlot = apiAvailableEquipmentBySlot(sourcePreset);
    const available = bySlot[slot] || [];
    const fromSlotFamily = bestOwnedInItemFamily(available, requiredHrid);
    if (fromSlotFamily) return fromSlotFamily;
    // Safety net: same-name / refined may sit under another slot key in constraints.
    const fromAnyFamily = bestOwnedInItemFamily(Object.values(bySlot).flat(), requiredHrid);
    if (fromAnyFamily) return fromAnyFamily;
    const options = available
        .filter((owned) => apiEquipmentMatchesRequirement(owned, required, { allowLevelUpgrade: false }))
        .sort(compareEquipmentOptions);
    if (options.length) return options[0];
    const fallbackOptions = available
        .filter((owned) => apiEquipmentMatchesRequirement(owned, required, { allowLevelUpgrade: true }))
        .sort(compareEquipmentOptions);
    return fallbackOptions[0] || null;
}

function alignBuildEquipmentToDefault(build, sourcePreset, defaultPreset) {
    for (const required of defaultPreset?.build?.player?.equipment || []) {
        if (!required?.itemHrid) continue;
        const owned = bestOwnedEquipmentForRequirement(sourcePreset, required);
        if (owned) {
            setBuildEquipment(build, {
                itemHrid: owned.itemHrid,
                enhancementLevel: Number(owned.enhancementLevel) || 0,
                itemLocationHrid: required.itemLocationHrid || `/item_locations/${equipmentTypeSlot(owned.itemHrid)}`,
            });
        }
    }
}

function triggerMapForAbilities(sourceBuild, defaultBuild, abilityHrids) {
    const triggerMap = {};
    for (const abilityHrid of abilityHrids.filter(Boolean)) {
        triggerMap[abilityHrid] = clone(defaultBuild?.triggerMap?.[abilityHrid]
            || sourceBuild?.triggerMap?.[abilityHrid]
            || []);
    }
    return triggerMap;
}

function alignBuildAbilitiesToDefault(build, sourcePreset, defaultPreset, auraName) {
    const abilityLevels = presetAbilityLevels(sourcePreset);
    const defaultAbilities = (defaultPreset?.build?.abilities || []).slice(1)
        .filter((ability) => ability.abilityHrid)
        .slice(0, 4);
    const specialAbilityHrid = auraName ? auraAbilityHrid(auraName) : "";
    const regularAbilities = defaultAbilities.map((ability) => ({
        abilityHrid: abilityLevels[ability.abilityHrid] ? ability.abilityHrid : "",
        level: abilityLevels[ability.abilityHrid] || 1,
    }));
    while (regularAbilities.length < 4) {
        regularAbilities.push({ abilityHrid: "", level: 1 });
    }
    build.abilities = [
        { abilityHrid: specialAbilityHrid, level: specialAbilityHrid ? (abilityLevels[specialAbilityHrid] || 1) : 1 },
        ...regularAbilities,
    ];
    build.triggerMap = triggerMapForAbilities(sourcePreset.build, defaultPreset?.build, build.abilities.map((ability) => ability.abilityHrid));
}

function allocationPresetBaseName(name) {
    return String(name || "")
        .split(/\s+-\s+/)[0]
        .trim() || name;
}

function specialAbilityNameFromBuild(build) {
    const specialHrid = (build?.abilities || [])[0]?.abilityHrid;
    return specialHrid ? localizedName("abilityNames", abilitiesMap[specialHrid]) : "";
}

function generatedPresetDisplayName(baseName, build, auraName = "") {
    const suffix = auraName || specialAbilityNameFromBuild(build);
    return suffix ? `${baseName}-${suffix}` : baseName;
}

function refreshGeneratedPresetName(preset) {
    if (!preset?.generatedFromAllocation) return;
    const baseName = preset.generatedBaseName || `${allocationPresetBaseName(preset.name)}-公会试炼-${preset.allocationTag || ""}`;
    preset.generatedBaseName = baseName;
    preset.name = generatedPresetDisplayName(baseName, preset.build, preset.allocationAura || "");
}

function syncGeneratedBaseNameFromManualName(preset) {
    if (!preset?.generatedFromAllocation) return;
    preset.generatedBaseName = stripInsanityReviveSuffix(preset.name);
}

const insanityReviveAbilities = ["/abilities/insanity", "/abilities/revive", "/abilities/invincible"];

function specialSuffixName(abilityHrid) {
    return localizedName("abilityNames", abilitiesMap[abilityHrid])
        || (abilityHrid === "/abilities/insanity" ? "疯狂" : abilityHrid === "/abilities/revive" ? "复活" : "无敌");
}

function stripInsanityReviveSuffix(name) {
    return String(name || "").replace(/\s*-\s*(疯狂|复活|无敌|Insanity|Revive|Invincible)$/i, "");
}

function hasAuraSuffixOrAbility(preset) {
    const specialHrid = preset?.build?.abilities?.[0]?.abilityHrid || "";
    return specialHrid.endsWith("_aura") || /\s*-\s*[^-]*(光环|Aura)$/i.test(preset?.name || "");
}

function specialLevelForPreset(preset, abilityHrid) {
    return presetAbilityLevels(preset)[abilityHrid] || 1;
}

function hasBulwarkWeapon(preset) {
    return (preset?.build?.player?.equipment || []).some((equipment) =>
        equipmentSlot(equipment) === "two_hand" && String(equipment.itemHrid || "").includes("bulwark"));
}

function setPresetInsanityRevive(preset, abilityHrid) {
    preset.build.abilities ||= [];
    while (preset.build.abilities.length < 5) preset.build.abilities.push({ abilityHrid: "", level: 1 });
    preset.build.abilities[0] = {
        abilityHrid,
        level: specialLevelForPreset(preset, abilityHrid),
    };
    preset.build.triggerMap ||= {};
    preset.build.triggerMap[abilityHrid] ||= clone(abilitiesMap[abilityHrid]?.defaultCombatTriggers || []);
    const baseName = preset.generatedFromAllocation
        ? (preset.generatedBaseName || stripInsanityReviveSuffix(preset.name))
        : stripInsanityReviveSuffix(preset.name);
    if (preset.generatedFromAllocation) preset.generatedBaseName = baseName;
    preset.name = `${baseName}-${specialSuffixName(abilityHrid)}`;
}

function clearPresetInsanityRevive(preset) {
    let changed = false;
    const specialHrid = preset.build?.abilities?.[0]?.abilityHrid;
    if (insanityReviveAbilities.includes(specialHrid)) {
        preset.build.abilities[0] = { abilityHrid: "", level: 1 };
        changed = true;
    }
    const strippedName = stripInsanityReviveSuffix(preset.name);
    if (strippedName !== preset.name) {
        preset.name = strippedName;
        changed = true;
    }
    return changed;
}

function normalizedInsanityReviveWeights(insanityValue = insanityReviveState.insanityWeight, reviveValue = insanityReviveState.reviveWeight) {
    const insanity = Math.max(0, Math.min(1, Number(insanityValue) || 0));
    const revive = Math.max(0, Math.min(1, Number(reviveValue) || 0));
    const total = insanity + revive;
    if (!total) return { insanityWeight: 0.5, reviveWeight: 0.5 };
    return {
        insanityWeight: insanity / total,
        reviveWeight: revive / total,
    };
}

function setInsanityReviveWeights(insanityWeight, reviveWeight) {
    const normalized = normalizedInsanityReviveWeights(insanityWeight, reviveWeight);
    insanityReviveState.insanityWeight = Number(normalized.insanityWeight.toFixed(3));
    insanityReviveState.reviveWeight = Number(normalized.reviveWeight.toFixed(3));
}

function insanityReviveAbilityForRank(index, totalCount) {
    const insanityCount = Math.round(totalCount * insanityReviveState.insanityWeight);
    return index < insanityCount ? "/abilities/insanity" : "/abilities/revive";
}

function rankedPresetIdsFromCurrentResults() {
    const rows = [];
    const seen = new Set();
    for (const boss of state.bosses) {
        const stats = boss.result?.templateStats;
        if (!stats) return [];
        const idsByName = new Map();
        for (const presetId of boss.slots.filter(Boolean)) {
            const preset = state.presets.find((item) => item.id === presetId);
            if (!preset) continue;
            idsByName.set(preset.name, [...(idsByName.get(preset.name) || []), preset.id]);
        }
        for (const [name, entry] of Object.entries(stats)) {
            const ids = idsByName.get(name) || [];
            for (const id of ids) {
                if (seen.has(id)) continue;
                const preset = state.presets.find((item) => item.id === id);
                if (!preset || preset.type !== "fixed" || hasAuraSuffixOrAbility(preset)) continue;
                seen.add(id);
                rows.push({
                    id,
                    averageDamage: Number(entry.count || 0) ? Number(entry.damage || 0) / Number(entry.count || 1) : 0,
                });
            }
        }
    }
    return rows.sort((a, b) => b.averageDamage - a.averageDamage).map((row) => row.id);
}

function assignInsanityReviveFromResults() {
    if (!state.bosses.every((boss) => boss.result?.templateStats)) {
        insanityReviveState.message = "";
        insanityReviveState.error = tr("insanityReviveNeedResults");
        renderSimulationResultTools();
        return;
    }
    let changed = 0;
    const presetIds = rankedPresetIdsFromCurrentResults();
    const nonShieldCount = presetIds.filter((presetId) => {
        const preset = state.presets.find((item) => item.id === presetId);
        return !(insanityReviveState.shieldUsesInvincible && hasBulwarkWeapon(preset));
    }).length;
    let nonShieldIndex = 0;
    for (const presetId of presetIds) {
        const preset = state.presets.find((item) => item.id === presetId);
        if (!preset) continue;
        const isBulwarkShield = insanityReviveState.shieldUsesInvincible && hasBulwarkWeapon(preset);
        const abilityHrid = isBulwarkShield
            ? "/abilities/invincible"
            : insanityReviveAbilityForRank(nonShieldIndex, nonShieldCount);
        if (!isBulwarkShield) nonShieldIndex += 1;
        setPresetInsanityRevive(preset, abilityHrid);
        changed += 1;
    }
    insanityReviveState.error = "";
    insanityReviveState.message = tr("insanityReviveAssigned", { count: changed });
    saveAndRender();
}

function clearAllInsanityRevive() {
    let changed = 0;
    state.presets
        .filter((preset) => preset.type === "fixed")
        .forEach((preset) => {
            if (clearPresetInsanityRevive(preset)) changed += 1;
        });
    insanityReviveState.error = "";
    insanityReviveState.message = tr("insanityReviveCleared", { count: changed });
    saveAndRender();
}

function liveEquipmentSourcePreset(sourcePreset) {
    if (!sourcePreset) return sourcePreset;
    if (isReviewedPreset(sourcePreset)) {
        const apiSource = state.presets.find((preset) => preset.id === sourcePreset.sourcePresetId);
        if (apiSource) {
            return {
                ...sourcePreset,
                build: apiSource.build || sourcePreset.build,
                constraints: apiSource.constraints || sourcePreset.constraints,
                source: apiSource.source || sourcePreset.source,
                sourceCharacterId: apiSource.sourceCharacterId || sourcePreset.sourceCharacterId,
            };
        }
    }
    return sourcePreset;
}

function buildGuildTrialFixedPreset(sourcePreset, role, aura) {
    const defaultPreset = defaultPresetForTag(role.tag);
    const equipmentSource = liveEquipmentSourcePreset(sourcePreset);
    const build = clone(equipmentSource.build);
    build.player.equipment ||= [];
    build.abilities ||= [];
    build.triggerMap ||= {};
    if (defaultPreset) {
        alignBuildEquipmentToDefault(build, equipmentSource, defaultPreset);
        alignBuildAbilitiesToDefault(build, equipmentSource, defaultPreset, aura?.aura || "");
    } else {
        const specialAbilityHrid = aura?.aura ? auraAbilityHrid(aura.aura) : "";
        build.abilities[0] = { abilityHrid: "", level: 1 };
        if (specialAbilityHrid) {
            build.abilities[0] = {
                abilityHrid: specialAbilityHrid,
                level: presetAbilityLevels(equipmentSource)[specialAbilityHrid] || 1,
            };
        }
    }
    const generatedBaseName = `${allocationPresetBaseName(sourcePreset.name)}-公会试炼-${role.tag}`;
    const preset = {
        id: createId(),
        type: "fixed",
        source: equipmentSource.source,
        sourceCharacterId: equipmentSource.sourceCharacterId,
        name: generatedBaseName,
        build,
        constraints: equipmentSource.constraints ? clone(equipmentSource.constraints) : undefined,
        generatedFromAllocation: true,
        generatedBaseName,
        sourceReviewedId: sourcePreset.id,
        allocationTag: role.tag,
        allocationAura: aura?.aura || "",
    };
    refreshGeneratedPresetName(preset);
    return preset;
}

function upsertGuildTrialFixedPreset(role, aura) {
    const sourcePreset = state.presets.find((preset) => preset.id === role.presetId);
    if (!sourcePreset) return role.presetId;
    const generated = buildGuildTrialFixedPreset(sourcePreset, role, aura);
    const existingIndex = state.presets.findIndex((preset) =>
        preset.generatedFromAllocation
        && preset.sourceReviewedId === sourcePreset.id
        && preset.allocationTag === role.tag);
    if (existingIndex >= 0) {
        generated.name = state.presets[existingIndex].name;
        generated.generatedBaseName = state.presets[existingIndex].generatedBaseName
            || stripInsanityReviveSuffix(state.presets[existingIndex].name);
        generated.id = state.presets[existingIndex].id;
        state.presets[existingIndex] = generated;
        return generated.id;
    }
    state.presets.push(generated);
    return generated.id;
}

function presetTagsHtml(preset) {
    const tags = presetTagsForDisplay(preset);
    if (!tags.length) return "";
    const visibleTags = tags.slice(0, 8);
    const overflow = tags.length - visibleTags.length;
    return `<div class="preset-tags" title="${escapeHtml(tags.join(" / "))}">
        ${visibleTags.map((tag) => `<span class="preset-tag">${escapeHtml(tag)}</span>`).join("")}
        ${overflow > 0 ? `<span class="preset-tag">+${overflow}</span>` : ""}
    </div>`;
}

function renderBulkDeleteControls() {
    const target = document.getElementById("bulkDeleteControls");
    if (!target) return;
    if (!bulkDeleteState.enabled) {
        target.className = "d-none mb-2";
        target.innerHTML = "";
        return;
    }
    target.className = "d-flex flex-wrap align-items-center gap-2 mb-2";
    target.innerHTML = `
        <span class="small text-muted">${escapeHtml(tr("bulkDeleteHint", { count: bulkDeleteState.selectedIds.length }))}</span>
        <button id="selectAllPresets" class="btn btn-outline-primary btn-sm">${tr("selectAllPresets")}</button>
        <button id="clearSelectedPresets" class="btn btn-outline-secondary btn-sm" ${bulkDeleteState.selectedIds.length ? "" : "disabled"}>${tr("clearSelectedPresets")}</button>
        <button id="deleteSelectedPresets" class="btn btn-danger btn-sm" ${bulkDeleteState.selectedIds.length ? "" : "disabled"}>${tr("deleteSelectedPresets")}</button>
        <button id="cancelBulkDelete" class="btn btn-outline-secondary btn-sm">${tr("cancelBulkDelete")}</button>
    `;
}

function visiblePresetIds() {
    return ["fixed", "reviewed", "default"].flatMap((type) =>
        state.presets.filter((preset) => preset.type === type).map((preset) => preset.id));
}

function setBulkDeleteEnabled(enabled) {
    bulkDeleteState.enabled = enabled;
    bulkDeleteState.selectedIds = [];
    bulkDeleteState.lastSelectedId = null;
    renderPresetGroups();
}

function selectAllVisiblePresets() {
    bulkDeleteState.selectedIds = visiblePresetIds();
    bulkDeleteState.lastSelectedId = bulkDeleteState.selectedIds.at(-1) || null;
    renderPresetGroups();
}

function clearBulkDeleteSelection() {
    bulkDeleteState.selectedIds = [];
    bulkDeleteState.lastSelectedId = null;
    renderPresetGroups();
}

function toggleBulkDeletePreset(id, event = {}) {
    const selected = new Set(bulkDeleteState.selectedIds);
    if (event.shiftKey && bulkDeleteState.lastSelectedId) {
        const ids = visiblePresetIds();
        const start = ids.indexOf(bulkDeleteState.lastSelectedId);
        const end = ids.indexOf(id);
        if (start >= 0 && end >= 0) {
            ids.slice(Math.min(start, end), Math.max(start, end) + 1)
                .forEach((presetId) => selected.add(presetId));
        } else {
            selected.add(id);
        }
    } else if (selected.has(id)) {
        selected.delete(id);
    } else {
        selected.add(id);
    }
    bulkDeleteState.selectedIds = [...selected];
    bulkDeleteState.lastSelectedId = id;
    renderPresetGroups();
}

function deleteSelectedPresets() {
    const selected = new Set(bulkDeleteState.selectedIds);
    if (!selected.size) return;
    const expanded = new Set(selected);
    state.presets.forEach((preset) => {
        if (selected.has(preset.sourcePresetId)) {
            expanded.add(preset.id);
        }
    });
    state.presets = state.presets.filter((preset) => !expanded.has(preset.id));
    state.bosses.forEach((boss) => {
        boss.slots = boss.slots.map((presetId) => expanded.has(presetId) ? null : presetId);
        boss.result = null;
        boss.progress = null;
    });
    bulkDeleteState.enabled = false;
    bulkDeleteState.selectedIds = [];
    bulkDeleteState.lastSelectedId = null;
    saveAndRender();
}

const auraAbilityFallbacks = {
    守护光环: "/abilities/guardian_aura",
    暴击光环: "/abilities/critical_aura",
    速度光环: "/abilities/speed_aura",
    物理光环: "/abilities/fierce_aura",
    元素光环: "/abilities/mystic_aura",
};

function equipmentSlot(equipment) {
    return equipment.itemLocationHrid?.replace("/item_locations/", "");
}

function conflictingEquipmentSlots(slot) {
    if (slot === "two_hand") return ["main_hand", "off_hand"];
    if (slot === "main_hand" || slot === "off_hand") return ["two_hand"];
    return [];
}

function defaultPresetForTag(tag) {
    return state.presets.find((preset) => preset.type === "default" && preset.name === tag);
}

function auraAbilityHrid(auraName) {
    const preset = state.presets.find((item) =>
        item.name === auraName
        && (item.type === "default" || isSpecialTagPreset(item))
        && firstPresetAbility(item)?.abilityHrid?.endsWith("_aura"));
    const firstAbility = firstPresetAbility(preset);
    return firstAbility?.abilityHrid || auraAbilityFallbacks[auraName] || "";
}

function apiAuraLevel(preset, auraName) {
    return presetAbilityLevels(preset)[auraAbilityHrid(auraName)] || 0;
}

function normalizedAllocationName(name) {
    return String(name || "").trim().toLowerCase();
}

function specialAbilityDisplayNames() {
    return new Set(Object.values(abilitiesMap)
        .filter((ability) => ability.isSpecialAbility)
        .flatMap((ability) => [
            ability.name,
            localizedName("abilityNames", ability),
        ])
        .map(normalizedAllocationName)
        .filter(Boolean));
}

function isSpecialAbilityNamedDefaultPreset(preset) {
    return preset.type === "default" && specialAbilityDisplayNames().has(normalizedAllocationName(preset.name));
}

function allocationImportanceDivisor() {
    return Math.max(1, state.presets.filter((preset) =>
        preset.type === "default" && !isSpecialAbilityNamedDefaultPreset(preset)).length);
}

function roleScore(bossData, tag) {
    return Number(bossData.gain?.[tag] || 0);
}

function skillLevelForBuild(build, skillHrid) {
    const key = String(skillHrid || "").split("/").pop();
    return Number(build?.player?.[`${key}Level`]) || 1;
}

function auraStrengthForPreset(preset, auraName) {
    const abilityHrid = auraAbilityHrid(auraName);
    const level = apiAuraLevel(preset, auraName);
    const ability = abilitiesMap[abilityHrid];
    if (!ability || level <= 0) return 0;
    return (ability.abilityEffects || [])
        .flatMap((effect) => effect.buffs || [])
        .reduce((total, buff) => {
            const multiplier = buff.multiplierForSkillHrid && Number(buff.multiplierPerSkillLevel || 0) > 0
                ? 1 + skillLevelForBuild(preset.build, buff.multiplierForSkillHrid) * Number(buff.multiplierPerSkillLevel || 0)
                : 1;
            const flatBoost = (Number(buff.flatBoost || 0) + (level - 1) * Number(buff.flatBoostLevelBonus || 0)) * multiplier;
            const ratioBoost = (Number(buff.ratioBoost || 0) + (level - 1) * Number(buff.ratioBoostLevelBonus || 0)) * multiplier;
            return total + Math.abs(flatBoost) + Math.abs(ratioBoost);
        }, 0);
}

function bestAuraStrengths(candidates, bossEntries = allocationBossEntries()) {
    const requiredAuras = [...new Set(bossEntries.flatMap(([, boss]) => boss.requiredAuras || []))];
    return Object.fromEntries(requiredAuras.map((aura) => [
        aura,
        Math.max(0, ...candidates.map((candidate) =>
            Number(candidate.auraStrengths?.[aura] ?? auraStrengthForPreset(candidate.preset, aura)) || 0)),
    ]));
}

function auraScore(strength, bestStrength) {
    if (Number(strength || 0) <= 0) return 0;
    const ratio = Number(bestStrength || 0) > 0 ? Number(strength || 0) / Number(bestStrength || 0) : 0;
    return ratio;
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

function scoreDataForEncounter(encounterHrid) {
    const entry = Object.entries(state.allocationConfig?.bosses || {})
        .find(([, bossData]) => bossData.encounterHrid === encounterHrid);
    if (!entry) return null;
    return { dataId: entry[0], ...entry[1] };
}

function allocationBossKeyForEncounter(encounterHrid) {
    const existing = Object.entries(state.allocationConfig?.bosses || {})
        .find(([, bossData]) => bossData.encounterHrid === encounterHrid)?.[0];
    if (existing) return existing;
    const baseKey = String(encounterHrid || "").split("/").pop() || createId();
    let key = baseKey;
    let index = 2;
    while (state.allocationConfig?.bosses?.[key]) {
        key = `${baseKey}_${index}`;
        index += 1;
    }
    return key;
}

function blankAllocationBossConfig(encounterHrid) {
    return {
        label: tr(encounterKeyForHrid(encounterHrid)) || encounterHrid || "",
        encounterHrid,
        survivalGroups: [],
        requiredAuras: [],
        gain: {},
        importance: {},
    };
}

function ensureAllocationConfigForSelectedBosses() {
    state.allocationConfig ||= normalizeAllocationConfig(apiAllocationScoreData);
    state.allocationConfig.bosses ||= {};
    for (const boss of state.bosses) {
        const key = allocationBossKeyForEncounter(boss.encounterHrid);
        state.allocationConfig.bosses[key] ||= blankAllocationBossConfig(boss.encounterHrid);
    }
    state.allocationConfig = normalizeAllocationConfig(state.allocationConfig);
}

function selectedAllocationBossEntries() {
    ensureAllocationConfigForSelectedBosses();
    const seen = new Set();
    return state.bosses.flatMap((boss) => {
        const key = allocationBossKeyForEncounter(boss.encounterHrid);
        if (seen.has(key)) return [];
        seen.add(key);
        return [[key, state.allocationConfig.bosses[key]]];
    });
}

function allocationBossEntries() {
    ensureAllocationConfigForSelectedBosses();
    return state.bosses.map((boss, index) => {
        const scoreData = scoreDataForEncounter(boss.encounterHrid);
        return [`boss${index}`, {
            ...(scoreData || {}),
            bossIndex: index,
            label: scoreData?.label || tr(encounterKeyForHrid(boss.encounterHrid)) || boss.encounterHrid,
            encounterHrid: boss.encounterHrid,
            missingScoreData: !scoreData,
        }];
    });
}

function allocationRoleTags(preset) {
    const auraNames = new Set(allocationBossEntries().flatMap(([, boss]) => boss.requiredAuras || []));
    const tags = isReviewedPreset(preset) ? (preset.reviewedTags || []) : apiPresetTags(preset);
    return tags.filter((tag) => !auraNames.has(tag));
}

function allocationCandidatePools() {
    return state.presets
        .filter(isReviewedPreset)
        .map((preset, playerIndex) => ({
            playerIndex,
            preset,
            roleTags: allocationRoleTags(preset),
        }));
}

function addAllocationCoefficient(model, variableName, constraintName, value) {
    model.variables[variableName][constraintName] = (model.variables[variableName][constraintName] || 0) + value;
}

function allocationMissingItems(candidates) {
    const missing = [];
    for (const [bossId, bossData] of allocationBossEntries()) {
        for (const aura of bossData.requiredAuras || []) {
            if (!candidates.some((candidate) => apiAuraLevel(candidate.preset, aura) > 0)) {
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

function buildAllocationModel(candidates) {
    const diminishingPenalty = Number(allocationState.diminishingPenalty) || 0;
    const importanceDivisor = allocationImportanceDivisor();
    const bestStrengths = bestAuraStrengths(candidates);
    const model = {
        optimize: "score",
        opType: "max",
        constraints: {},
        variables: {},
        binaries: {},
        options: { timeout: 20000 },
    };
    const metadata = {};
    const bossEntries = allocationBossEntries();
    const bossIds = bossEntries.map(([bossId]) => bossId);
    const [firstBossId, secondBossId] = bossIds;
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
        model.constraints[`limit_${bossId}`] = { max: state.settings.rosterLimit };
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
                    score: (group.importance / importanceDivisor) * Math.pow(IMPORTANCE_COVERAGE_DECAY, count - 1),
                    [constraintName]: -count,
                };
                model.binaries[variableName] = 1;
            }
        }
    }
    if (diminishingPenalty > 0 && firstBossId && secondBossId) {
        model.constraints.balanceFirstBoss = { max: 0 };
        model.constraints.balanceSecondBoss = { max: 0 };
        model.variables.balanceOverFirstBoss = {
            score: -diminishingPenalty,
            balanceFirstBoss: -1,
        };
        model.variables.balanceOverSecondBoss = {
            score: -diminishingPenalty,
            balanceSecondBoss: -1,
        };
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
                const level = apiAuraLevel(candidate.preset, aura);
                const strength = auraStrengthForPreset(candidate.preset, aura);
                if (level <= 0 || strength <= 0) continue;
                const variableName = `a_${candidate.playerIndex}_${bossId}_${bossData.requiredAuras.indexOf(aura)}`;
                const score = auraScore(strength, bestStrengths[aura]);
                model.variables[variableName] = {
                    score,
                    [`aura_${bossId}_${aura}`]: 1,
                    [`playerAura_${candidate.playerIndex}_${bossId}`]: 1,
                    [`linkAura_${candidate.playerIndex}_${bossId}_${bossData.requiredAuras.indexOf(aura)}`]: 1,
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

function solveApiAllocation() {
    const missingBosses = allocationBossEntries()
        .filter(([, bossData]) => bossData.missingScoreData)
        .map(([, bossData]) => bossData.label);
    if (missingBosses.length) {
        throw new Error(tr("allocationMissingScoreData", { bosses: missingBosses.join("，") }));
    }
    const candidates = allocationCandidatePools().filter((candidate) => candidate.roleTags.length);
    if (!candidates.length) {
        throw new Error(tr("reviewedRequired"));
    }
    const missing = allocationMissingItems(candidates);
    if (missing.length) {
        throw new Error(tr("allocationMissing", { items: missing.join("，") }));
    }
    const { model, metadata } = buildAllocationModel(candidates);
    const solution = solver.Solve(model);
    if (!solution.feasible) {
        throw new Error(tr("allocationInfeasible"));
    }
    return {
        score: Number(solution.result || 0),
        bosses: projectAllocationResult(solution, metadata, allocationBossEntries(), state.settings.rosterLimit),
        solvedAt: Date.now(),
    };
}

function buildAllocationPayload() {
    const bossEntries = allocationBossEntries();
    const missingBosses = bossEntries
        .filter(([, bossData]) => bossData.missingScoreData)
        .map(([, bossData]) => bossData.label);
    if (missingBosses.length) {
        throw new Error(tr("allocationMissingScoreData", { bosses: missingBosses.join("，") }));
    }
    const requiredAuras = [...new Set(bossEntries.flatMap(([, boss]) => boss.requiredAuras || []))];
    const candidates = allocationCandidatePools()
        .filter((candidate) => candidate.roleTags.length)
        .map((candidate) => ({
            playerIndex: candidate.playerIndex,
            presetId: candidate.preset.id,
            playerName: candidate.preset.name,
            roleTags: candidate.roleTags,
            auraLevels: Object.fromEntries(requiredAuras.map((aura) => [aura, apiAuraLevel(candidate.preset, aura)])),
            auraStrengths: Object.fromEntries(requiredAuras.map((aura) => [aura, auraStrengthForPreset(candidate.preset, aura)])),
        }));
    if (!candidates.length) {
        throw new Error(tr("reviewedRequired"));
    }
    return {
        candidates,
        bossEntries,
        rosterLimit: state.settings.rosterLimit,
        importanceDivisor: allocationImportanceDivisor(),
        diminishingPenalty: Number(allocationState.diminishingPenalty) || 0,
    };
}

function countBy(items, key) {
    return items.reduce((acc, item) => {
        const value = typeof key === "function" ? key(item) : item[key];
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});
}

function statsHtml(stats) {
    const entries = Object.entries(stats);
    if (!entries.length) return `<span class="text-muted">${tr("noneText")}</span>`;
    return entries.map(([name, count]) => `<span class="badge bg-light text-dark border me-1 mb-1">${escapeHtml(name)} x${count}</span>`).join("");
}

function csvText(values) {
    return (values || []).join("，");
}

function parseCsv(text) {
    return String(text || "")
        .split(/[,，\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function allocationScoreTags(bossData) {
    return [...new Set([
        ...Object.keys(bossData.gain || {}),
        ...Object.keys(bossData.importance || {}),
    ])].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function encounterOptionsHtml(value) {
    return encounters.map(([hrid, labelKey]) =>
        `<option value="${escapeHtml(hrid)}" ${hrid === value ? "selected" : ""}>${escapeHtml(tr(labelKey))}</option>`).join("");
}

function renderAllocationConfigBoss(bossKey, bossData) {
    const survivalRows = (bossData.survivalGroups || []).map((group) => `
        <tr data-allocation-survival-row>
            <td><input class="form-control form-control-sm" data-allocation-survival-name value="${escapeHtml(group.name)}"></td>
            <td><input class="form-control form-control-sm" data-allocation-survival-tags value="${escapeHtml(csvText(group.tags))}"></td>
            <td><input class="form-control form-control-sm" type="number" min="0" step="1" data-allocation-survival-min value="${Number(group.min) || 0}"></td>
            <td class="text-end"><button class="btn btn-outline-danger btn-sm" type="button" data-allocation-config-action="remove-row">${tr("delete")}</button></td>
        </tr>`).join("");
    const scoreRows = allocationScoreTags(bossData).map((tag) => `
        <tr data-allocation-score-row>
            <td><input class="form-control form-control-sm" data-allocation-score-tag value="${escapeHtml(tag)}"></td>
            <td><input class="form-control form-control-sm" type="number" step="0.0001" data-allocation-score-gain value="${Number(bossData.gain?.[tag] || 0)}"></td>
            <td><input class="form-control form-control-sm" type="number" step="0.0001" data-allocation-score-importance value="${Number(bossData.importance?.[tag] || 0)}"></td>
            <td class="text-end"><button class="btn btn-outline-danger btn-sm" type="button" data-allocation-config-action="remove-row">${tr("delete")}</button></td>
        </tr>`).join("");
    return `<section class="outlined-box allocation-config-boss" data-allocation-boss="${escapeHtml(bossKey)}">
        <div class="row g-2 align-items-end mb-3">
            <div class="col-12">
                <label class="form-label">${tr("allocationBoss")}
                    <input class="form-control" data-allocation-boss-label value="${escapeHtml(bossData.label)}">
                </label>
            </div>
            <div class="col-12">
                <label class="form-label">Encounter
                    <select class="form-select" data-allocation-boss-encounter>${encounterOptionsHtml(bossData.encounterHrid)}</select>
                </label>
            </div>
            <div class="col-12">
                <label class="form-label">${tr("allocationRequiredAuras")}
                    <input class="form-control" data-allocation-required-auras value="${escapeHtml(csvText(bossData.requiredAuras))}">
                </label>
            </div>
        </div>
        <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <strong>${tr("allocationSurvivalRules")}</strong>
                <button class="btn btn-outline-primary btn-sm" type="button" data-allocation-config-action="add-survival">${tr("addAllocationRule")}</button>
            </div>
            <div class="table-responsive">
                <table class="table table-sm align-middle">
                    <thead><tr>
                        <th>${tr("allocationRuleName")}</th>
                        <th>${tr("allocationRuleTags")}</th>
                        <th style="width:110px">${tr("allocationRuleMin")}</th>
                        <th style="width:80px"></th>
                    </tr></thead>
                    <tbody data-allocation-survival-body>${survivalRows}</tbody>
                </table>
            </div>
        </div>
        <div>
            <div class="d-flex justify-content-between align-items-center mb-2">
                <strong>${tr("allocationRoleScores")}</strong>
                <button class="btn btn-outline-primary btn-sm" type="button" data-allocation-config-action="add-score">${tr("addAllocationRoleScore")}</button>
            </div>
            <div class="table-responsive">
                <table class="table table-sm align-middle">
                    <thead><tr>
                        <th>${tr("allocationRoleTagName")}</th>
                        <th style="width:150px">${tr("allocationGain")}</th>
                        <th style="width:150px">${tr("allocationImportance")}</th>
                        <th style="width:80px"></th>
                    </tr></thead>
                    <tbody data-allocation-score-body>${scoreRows}</tbody>
                </table>
            </div>
        </div>
    </section>`;
}

function renderAllocationConfigEditor() {
    const target = document.getElementById("allocationConfigEditor");
    if (!target) return;
    target.innerHTML = `<div class="allocation-config-columns">${selectedAllocationBossEntries()
        .map(([bossKey, bossData]) => renderAllocationConfigBoss(bossKey, bossData))
        .join("")}</div>`;
}

function allocationSurvivalRowHtml(group = { name: "", tags: [], min: 1 }) {
    return `<tr data-allocation-survival-row>
        <td><input class="form-control form-control-sm" data-allocation-survival-name value="${escapeHtml(group.name)}"></td>
        <td><input class="form-control form-control-sm" data-allocation-survival-tags value="${escapeHtml(csvText(group.tags))}"></td>
        <td><input class="form-control form-control-sm" type="number" min="0" step="1" data-allocation-survival-min value="${Number(group.min) || 0}"></td>
        <td class="text-end"><button class="btn btn-outline-danger btn-sm" type="button" data-allocation-config-action="remove-row">${tr("delete")}</button></td>
    </tr>`;
}

function allocationScoreRowHtml() {
    return `<tr data-allocation-score-row>
        <td><input class="form-control form-control-sm" data-allocation-score-tag value=""></td>
        <td><input class="form-control form-control-sm" type="number" step="0.0001" data-allocation-score-gain value="0"></td>
        <td><input class="form-control form-control-sm" type="number" step="0.0001" data-allocation-score-importance value="0"></td>
        <td class="text-end"><button class="btn btn-outline-danger btn-sm" type="button" data-allocation-config-action="remove-row">${tr("delete")}</button></td>
    </tr>`;
}

function allocationConfigFromEditor() {
    const bosses = clone(state.allocationConfig?.bosses || {});
    document.querySelectorAll("[data-allocation-boss]").forEach((section) => {
        const bossKey = section.dataset.allocationBoss;
        const gain = {};
        const importance = {};
        section.querySelectorAll("[data-allocation-score-row]").forEach((row) => {
            const tag = row.querySelector("[data-allocation-score-tag]").value.trim();
            if (!tag) return;
            gain[tag] = Number(row.querySelector("[data-allocation-score-gain]").value) || 0;
            importance[tag] = Number(row.querySelector("[data-allocation-score-importance]").value) || 0;
        });
        bosses[bossKey] = {
            label: section.querySelector("[data-allocation-boss-label]").value.trim() || bossKey,
            encounterHrid: section.querySelector("[data-allocation-boss-encounter]").value,
            requiredAuras: parseCsv(section.querySelector("[data-allocation-required-auras]").value),
            survivalGroups: [...section.querySelectorAll("[data-allocation-survival-row]")].map((row) => ({
                name: row.querySelector("[data-allocation-survival-name]").value.trim(),
                tags: parseCsv(row.querySelector("[data-allocation-survival-tags]").value),
                min: Math.max(0, Math.floor(Number(row.querySelector("[data-allocation-survival-min]").value) || 0)),
            })).filter((group) => group.name || group.tags.length || group.min > 0),
            gain,
            importance,
        };
    });
    return normalizeAllocationConfig({ bosses });
}

function allocationBossKeyForIndex(bossIndex) {
    const encounterHrid = state.bosses[Number(bossIndex) || 0]?.encounterHrid;
    return Object.entries(state.allocationConfig?.bosses || {})
        .find(([, bossData]) => bossData.encounterHrid === encounterHrid)?.[0] || "";
}

function ablationResultTag(entry) {
    return tagFromPresetName({ name: entry.name }) || String(entry.name || "").trim();
}

function importAblationResultsToAllocationConfig() {
    if (!ablationState.results.length) {
        const message = document.getElementById("allocationConfigMessage");
        if (message) {
            message.className = "small mt-2 text-danger";
            message.textContent = tr("ablationNoResults");
        }
        return;
    }
    state.allocationConfig = allocationConfigFromEditor();
    const bossIndex = ablationState.baseline?.bossIndex ?? ablationState.targetBossIndex;
    const bossKey = allocationBossKeyForIndex(bossIndex);
    const bossData = state.allocationConfig.bosses[bossKey];
    if (!bossData) return;
    let imported = 0;
    for (const entry of ablationState.results) {
        const tag = ablationResultTag(entry);
        if (!tag) continue;
        if (entry.mode === "reduction") {
            bossData.importance[tag] = Math.max(0, -(Number(entry.diffPercent) || 0) / 100);
        } else {
            bossData.gain[tag] = (Number(entry.diffPercent) || 0) / 100;
        }
        imported += 1;
    }
    state.allocationConfig = normalizeAllocationConfig(state.allocationConfig);
    allocationState.result = null;
    allocationState.message = tr("allocationConfigImported", { count: imported, boss: bossData.label });
    saveState();
    renderAllocationPanel();
    renderAllocationConfigEditor();
    const message = document.getElementById("allocationConfigMessage");
    if (message) {
        message.className = "small mt-2 text-success";
        message.textContent = allocationState.message;
    }
}

function openAllocationConfigModal() {
    renderAllocationConfigEditor();
    const message = document.getElementById("allocationConfigMessage");
    if (message) message.textContent = "";
    bootstrap.Modal.getOrCreateInstance(document.getElementById("allocationConfigModal")).show();
}

function openAllocationConfigTransferModal() {
    // Keep editor edits when exporting from the transfer modal.
    if (document.querySelector("[data-allocation-boss]")) {
        state.allocationConfig = allocationConfigFromEditor();
    }
    const textarea = document.getElementById("allocationConfigTransferText");
    const message = document.getElementById("allocationConfigTransferMessage");
    if (textarea) textarea.value = "";
    if (message) {
        message.className = "small mt-2";
        message.textContent = "";
    }
    bootstrap.Modal.getOrCreateInstance(document.getElementById("allocationConfigTransferModal")).show();
}

async function exportAllocationConfigTransfer() {
    const textarea = document.getElementById("allocationConfigTransferText");
    const message = document.getElementById("allocationConfigTransferMessage");
    try {
        if (document.querySelector("[data-allocation-boss]")) {
            state.allocationConfig = allocationConfigFromEditor();
        }
        const payload = {
            type: "mwi-allocation-config",
            version: 1,
            allocationConfig: normalizeAllocationConfig(state.allocationConfig),
        };
        textarea.value = await compressText(JSON.stringify(payload));
        textarea.focus();
        textarea.select();
        await navigator.clipboard?.writeText(textarea.value).catch(() => {});
        message.className = "small mt-2 text-success";
        message.textContent = tr("allocationConfigExported");
    } catch (error) {
        message.className = "small mt-2 text-danger";
        message.textContent = tr("allocationConfigTransferFailed", { message: error.message });
    }
}

async function importAllocationConfigTransfer() {
    const textarea = document.getElementById("allocationConfigTransferText");
    const message = document.getElementById("allocationConfigTransferMessage");
    try {
        const imported = JSON.parse(await decompressText(textarea.value));
        const config = imported?.allocationConfig || imported;
        if (!config?.bosses || typeof config.bosses !== "object") {
            throw new Error("Missing bosses");
        }
        state.allocationConfig = normalizeAllocationConfig(config);
        allocationState.result = null;
        allocationState.message = tr("allocationConfigTransferImported");
        saveState();
        renderAllocationPanel();
        renderAllocationConfigEditor();
        message.className = "small mt-2 text-success";
        message.textContent = tr("allocationConfigTransferImported");
        const configMessage = document.getElementById("allocationConfigMessage");
        if (configMessage) {
            configMessage.className = "small mt-2 text-success";
            configMessage.textContent = tr("allocationConfigTransferImported");
        }
    } catch (error) {
        message.className = "small mt-2 text-danger";
        message.textContent = tr("allocationConfigTransferFailed", { message: error.message });
    }
}

function auraForPlayer(bossResult, presetId) {
    return bossResult.auras.find((aura) => aura.presetId === presetId);
}

function renderAllocationBossResult(bossResult) {
    const rows = bossResult.roles.map((role) => {
        const aura = auraForPlayer(bossResult, role.presetId);
        return `<tr>
            <td>${escapeHtml(role.playerName)}</td>
            <td><span class="badge bg-primary">${escapeHtml(role.tag)}</span></td>
            <td>${aura ? `${escapeHtml(aura.aura)} Lv.${aura.level}` : `<span class="text-muted">${tr("noneText")}</span>`}</td>
            <td class="text-end">${role.score.toFixed(4)}</td>
        </tr>`;
    }).join("");
    return `<div class="col-xl-6">
        <div class="outlined-box h-100">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="mb-0">${escapeHtml(bossResult.label)}</h6>
                <span class="text-muted small">${bossResult.roles.length} 人</span>
            </div>
            <div class="allocation-results table-responsive">
                <table class="table table-sm align-middle mb-2">
                    <thead><tr>
                        <th>${tr("allocationPlayer")}</th>
                        <th>${tr("allocationTag")}</th>
                        <th>${tr("allocationAura")}</th>
                        <th class="text-end">${tr("allocationContribution")}</th>
                    </tr></thead>
                    <tbody>${rows || `<tr><td colspan="4" class="text-muted">${tr("allocationNoResult")}</td></tr>`}</tbody>
                </table>
            </div>
            <div class="small mb-1"><strong>${tr("allocationTagStats")}：</strong>${statsHtml(countBy(bossResult.roles, "tag"))}</div>
            <div class="small"><strong>${tr("allocationAuraStats")}：</strong>${statsHtml(countBy(bossResult.auras, "aura"))}</div>
        </div>
    </div>`;
}

function renderAllocationPanel() {
    const target = document.getElementById("apiAllocationPanel");
    if (!target) return;
    const resultHtml = allocationState.result
        ? `<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
                <strong>${tr("allocationScore")}：${allocationState.result.score.toFixed(4)}</strong>
                <button id="applyApiAllocation" class="btn btn-success btn-sm" ${allocationState.isRunning ? "disabled" : ""}>${tr("apiApplyAllocation")}</button>
            </div>
            <div class="row g-3 mt-1">
                ${Object.values(allocationState.result.bosses).map(renderAllocationBossResult).join("")}
            </div>`
        : `<p class="text-muted small mt-3 mb-0">${tr("allocationNoResult")}</p>`;
    target.innerHTML = `
        <div class="d-flex flex-wrap justify-content-between align-items-start gap-2">
            <div>
                <h5 class="mb-1">${tr("apiAllocation")}</h5>
                <div class="text-muted small">${tr("allocationHint")}</div>
            </div>
            <div class="d-flex flex-wrap gap-2">
                <button id="openAllocationConfig" class="btn btn-outline-secondary btn-sm" type="button">${tr("allocationConfig")}</button>
                <button id="runApiAllocation" class="btn btn-primary btn-sm" ${allocationState.isRunning ? "disabled" : ""}>${allocationState.isRunning ? tr("allocationRunning") : tr("apiAllocate")}</button>
            </div>
        </div>
        ${allocationState.error ? `<div class="text-danger small mt-2">${escapeHtml(allocationState.error)}</div>` : ""}
        ${allocationState.message ? `<div class="text-success small mt-2">${escapeHtml(allocationState.message)}</div>` : ""}
        ${allocationState.isRunning ? `<div class="progress mt-3">
            <div class="progress-bar progress-bar-striped progress-bar-animated" style="width:100%">${escapeHtml(allocationState.progress || tr("allocationRunning"))}</div>
        </div>` : ""}
        ${resultHtml}
    `;
}

function runApiAllocation() {
    if (allocationState.isRunning) return;
    allocationState.error = "";
    allocationState.message = "";
    allocationState.progress = tr("allocationProgressPreparing");
    allocationState.isRunning = true;
    allocationState.result = null;
    renderAllocationPanel();
    try {
        const payload = buildAllocationPayload();
        allocationWorker?.terminate();
        allocationWorker = new Worker(new URL("./apiAllocationWorker.js", import.meta.url));
        allocationWorker.onmessage = ({ data }) => {
            if (data.type === "progress") {
                allocationState.progress = tr(data.messageKey);
                renderAllocationPanel();
            }
            if (data.type === "result") {
                allocationState.result = data.result;
                allocationState.isRunning = false;
                allocationState.progress = null;
                allocationWorker.terminate();
                allocationWorker = null;
                renderAllocationPanel();
            }
            if (data.type === "error") {
                allocationState.result = null;
                allocationState.error = tr("allocationFailed", { message: data.error });
                allocationState.isRunning = false;
                allocationState.progress = null;
                allocationWorker.terminate();
                allocationWorker = null;
                renderAllocationPanel();
            }
        };
        allocationWorker.onerror = (event) => {
            allocationState.result = null;
            allocationState.error = tr("allocationFailed", { message: event.message });
            allocationState.isRunning = false;
            allocationState.progress = null;
            allocationWorker?.terminate();
            allocationWorker = null;
            renderAllocationPanel();
        };
        allocationWorker.postMessage({ type: "solve_api_allocation", payload: clone(payload) });
    } catch (error) {
        allocationState.result = null;
        allocationState.error = tr("allocationFailed", { message: error.message });
        allocationState.isRunning = false;
        allocationState.progress = null;
        renderAllocationPanel();
    }
}

function encounterKeyForHrid(encounterHrid) {
    return encounters.find(([hrid]) => hrid === encounterHrid)?.[1] || "";
}

function applyApiAllocation() {
    if (!allocationState.result) return;
    const orderedBosses = Object.values(allocationState.result.bosses)
        .sort((a, b) => a.bossIndex - b.bossIndex);
    for (const [index, bossResult] of orderedBosses.entries()) {
        const targetIndex = bossResult.bossIndex ?? index;
        const source = state.bosses[targetIndex] || blankBoss(bossResult.encounterHrid);
        const ids = bossResult.roles.map((role) =>
            upsertGuildTrialFixedPreset(role, auraForPlayer(bossResult, role.presetId)));
        state.bosses[targetIndex] = {
            ...source,
            slots: resizeSlots(ids, state.settings.rosterLimit),
            result: null,
            progress: null,
        };
    }
    allocationState.message = tr("allocationApplied");
    saveAndRender();
}

function renderPresetGroups() {
    renderBulkDeleteControls();
    for (const type of ["fixed", "reviewed", "default"]) {
        const target = document.getElementById(`${type}Presets`);
        const presets = state.presets.filter((preset) => preset.type === type);
        target.innerHTML = presets.map((preset) => `
            <article class="preset-card ${presetClassName(preset)} ${bulkDeleteState.selectedIds.includes(preset.id) ? "bulk-selected" : ""} border rounded p-2 text-center position-relative"
                draggable="true" data-preset-id="${escapeHtml(preset.id)}" title="${escapeHtml(sourceReviewedIsStale(preset) ? tr("sourceChanged") : tr("presetHint"))}">
                ${bulkDeleteState.enabled ? `<input class="form-check-input preset-bulk-checkbox" type="checkbox" ${bulkDeleteState.selectedIds.includes(preset.id) ? "checked" : ""} aria-label="${escapeHtml(preset.name)}">` : ""}
                <div class="fw-bold preset-name">${escapeHtml(preset.name)}</div>
                <small class="d-block preset-name">${escapeHtml(presetWeapon(preset))}</small>
                <small>${tr(type)}</small>
                ${presetTagsHtml(preset)}
            </article>
        `).join("");
        if (!presets.length) target.innerHTML = `<span class="text-muted small">${escapeHtml(tr("noPresets", { type: tr(type) }))}</span>`;
    }
    document.querySelectorAll(".preset-card").forEach((card) => {
        card.addEventListener("dragstart", (event) => {
            event.dataTransfer.effectAllowed = "copy";
            event.dataTransfer.setData("application/json", JSON.stringify({
                type: "preset",
                presetId: card.dataset.presetId,
            }));
            event.dataTransfer.setData("text/plain", card.dataset.presetId);
        });
        card.addEventListener("dragend", stopDragAutoScroll);
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

function summaryHtml(result, bossIndex) {
    if (!result) return "";
    const boss = state.bosses[bossIndex] || {};
    const statsSort = boss.statsSort || { field: "averageDamage", direction: "desc" };
    const sortIndicator = statsSort.field === "averageDamage"
        ? (statsSort.direction === "asc" ? "▲" : "▼")
        : "";
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
    const statsRows = Object.entries(result.templateStats || {}).map(([name, stats]) => ({
        name,
        stats,
        averageDamage: Number(stats.count || 0) ? Number(stats.damage || 0) / Number(stats.count || 1) : 0,
    }));
    if (statsSort.field === "averageDamage") {
        statsRows.sort((a, b) => statsSort.direction === "asc"
            ? a.averageDamage - b.averageDamage
            : b.averageDamage - a.averageDamage);
    }
    const rows = statsRows.map(({ name, stats, averageDamage }) => `
        <tr>
            <td>${escapeHtml(name)}</td>
            <td class="text-end">${stats.count}</td>
            <td class="text-end">${stats.alive}</td>
            <td class="text-end">${format(stats.damage)}</td>
            <td class="text-end">${format(averageDamage)}</td>
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
                    <thead class="table-light"><tr><th>${tr("preset")}</th><th class="text-end">${tr("count")}</th><th class="text-end">${tr("alive")}</th><th class="text-end">${tr("damage")}</th><th class="text-end"><button class="btn btn-link btn-sm p-0 text-decoration-none" data-action="sort-stats" data-boss-index="${bossIndex}" data-sort-field="averageDamage" title="${tr(statsSort.direction === "asc" ? "sortDescending" : "sortAscending")}">${tr("averageDamage")} ${sortIndicator}</button></th><th class="text-end">${tr("healing")}</th><th class="text-end">${tr("restored")}</th><th class="text-end">${tr("oom")}</th><th class="text-end">${tr("deaths")}</th></tr></thead>
                    <tbody>${rows || `<tr><td colspan="9" class="text-center text-muted">${tr("noStats")}</td></tr>`}</tbody>
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
                            <input id="random-${bossIndex}" class="form-control" type="number" min="1" max="${state.settings.rosterLimit}" value="${boss.randomCount}" data-boss-field="randomCount" data-boss-index="${bossIndex}">
                            <button class="btn btn-secondary" data-action="random-fill" data-boss-index="${bossIndex}">${tr("fill")}</button>
                        </div>
                    </div>
                    <button class="btn btn-outline-danger" data-action="clear-roster" data-boss-index="${bossIndex}">${tr("clear")}</button>
                </div>
                <div class="d-flex justify-content-between small text-muted mb-2">
                    <span>${tr("assigned", { count: assignedCount(boss), total: boss.slots.length })}</span>
                    <span>${tr("rosterHint")}</span>
                </div>
                <div class="roster-grid">
                    ${boss.slots.map((presetId, slotIndex) => {
                        const preset = state.presets.find((item) => item.id === presetId);
                        return `<button class="roster-slot ${presetClassName(preset)}" draggable="${preset ? "true" : "false"}" data-boss-index="${bossIndex}" data-slot-index="${slotIndex}" title="${escapeHtml(preset?.name || tr("emptySlot"))}">
                            <span class="slot-number">${slotIndex + 1}</span>
                            <span class="slot-label">${escapeHtml(preset ? preset.name : "+")}</span>
                        </button>`;
                    }).join("")}
                </div>
                ${boss.progress ? `
                    <div class="progress mt-3">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" style="width:${Math.max(5, Math.min(100, boss.progress.percent || 5))}%">
                            ${tr("progress", { level: boss.progress.level, layers: boss.progress.layers })}
                        </div>
                    </div>` : ""}
                ${summaryHtml(boss.result, bossIndex)}
            </section>
        </div>
    `).join("");

    document.querySelectorAll(".roster-slot").forEach((slot) => {
        slot.addEventListener("dragstart", (event) => {
            const boss = state.bosses[Number(slot.dataset.bossIndex)];
            const presetId = boss.slots[Number(slot.dataset.slotIndex)];
            if (!presetId) {
                event.preventDefault();
                return;
            }
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("application/json", JSON.stringify({
                type: "roster-slot",
                bossIndex: Number(slot.dataset.bossIndex),
                slotIndex: Number(slot.dataset.slotIndex),
                presetId,
            }));
            event.dataTransfer.setData("text/plain", presetId);
        });
        slot.addEventListener("drag", (event) => {
            if (event.clientY) updateDragAutoScroll(event.clientY);
        });
        slot.addEventListener("dragend", stopDragAutoScroll);
        slot.addEventListener("dragover", (event) => {
            event.preventDefault();
            updateDragAutoScroll(event.clientY);
        });
        slot.addEventListener("drop", (event) => {
            event.preventDefault();
            stopDragAutoScroll();
            const targetBossIndex = Number(slot.dataset.bossIndex);
            const targetSlotIndex = Number(slot.dataset.slotIndex);
            let payload = null;
            try {
                payload = JSON.parse(event.dataTransfer.getData("application/json") || "null");
            } catch {
                payload = null;
            }
            const presetId = payload?.presetId || event.dataTransfer.getData("text/plain");
            if (!state.presets.some((preset) => preset.id === presetId)) return;
            const targetBoss = state.bosses[targetBossIndex];
            if (payload?.type === "roster-slot") {
                const sourceBoss = state.bosses[Number(payload.bossIndex)];
                const sourceSlotIndex = Number(payload.slotIndex);
                if (!sourceBoss || (Number(payload.bossIndex) === targetBossIndex && sourceSlotIndex === targetSlotIndex)) return;
                const sourceValue = sourceBoss.slots[sourceSlotIndex];
                sourceBoss.slots[sourceSlotIndex] = targetBoss.slots[targetSlotIndex] || null;
                targetBoss.slots[targetSlotIndex] = sourceValue;
            } else {
                targetBoss.slots[targetSlotIndex] = presetId;
            }
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

function renderSimulationResultTools() {
    const target = document.getElementById("simulationResultTools");
    if (!target) return;
    const hasResults = state.bosses.every((boss) => boss.result?.templateStats);
    target.innerHTML = `
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
                <h5 class="mb-1">${tr("insanityReviveAssignment")}</h5>
                <div class="text-muted small">${tr("insanityReviveNeedResults")}</div>
            </div>
            <button id="assignInsanityRevive" class="btn btn-outline-primary btn-sm" ${hasResults ? "" : "disabled"}>${tr("assignInsanityRevive")}</button>
        </div>
        <div class="row g-2 mt-2">
            <div class="col-sm-6 col-lg-3">
                <label class="form-label" for="insanityWeight">${tr("insanityWeight")}</label>
                <input id="insanityWeight" class="form-control" type="number" min="0" max="1" step="0.05" value="${Number(insanityReviveState.insanityWeight).toFixed(2)}">
            </div>
            <div class="col-sm-6 col-lg-3">
                <label class="form-label" for="reviveWeight">${tr("reviveWeight")}</label>
                <input id="reviveWeight" class="form-control" type="number" min="0" max="1" step="0.05" value="${Number(insanityReviveState.reviveWeight).toFixed(2)}">
            </div>
            <div class="col-sm-6 col-lg-3 d-flex align-items-end">
                <label class="form-check mb-2">
                    <input id="shieldUsesInvincible" class="form-check-input" type="checkbox" ${insanityReviveState.shieldUsesInvincible ? "checked" : ""}>
                    <span class="form-check-label">${tr("shieldUsesInvincible")}</span>
                </label>
            </div>
        </div>
        ${insanityReviveState.error ? `<div class="text-danger small mt-2">${escapeHtml(insanityReviveState.error)}</div>` : ""}
        ${insanityReviveState.message ? `<div class="text-success small mt-2">${escapeHtml(insanityReviveState.message)}</div>` : ""}
    `;
}

function bossLabel(index) {
    return tr(index === 0 ? "leftBoss" : "rightBoss");
}

function participantCountFromTemplates(templates) {
    return templates.reduce((total, template) => total + Number(template.count || 0), 0);
}

function averageResults(results) {
    const count = results.length || 1;
    return {
        totalDamage: results.reduce((total, result) => total + Number(result.totalDamage || 0), 0) / count,
        points: results.reduce((total, result) => total + Number(result.points || 0), 0) / count,
        layersCompleted: results.reduce((total, result) => total + Number(result.layersCompleted || 0), 0) / count,
        currentLevel: results.reduce((total, result) => total + Number(result.currentLevel || 0), 0) / count,
    };
}

function ablationOptions() {
    if (ablationState.mode === "reduction") {
        return (ablationState.baseline?.templates || []).map((template, index) => ({
            value: String(index),
            label: `${template.name} x${Number(template.count || 0)}`,
        }));
    }
    return state.presets.map((preset) => ({
        value: preset.id,
        label: preset.name,
    }));
}

function ablationResultRows() {
    if (!ablationState.results.length) {
        return `<tr><td colspan="6" class="text-center text-muted">${tr("ablationNoResults")}</td></tr>`;
    }
    return ablationState.results.map((entry) => {
        const diffClass = entry.diff >= 0 ? "text-success" : "text-danger";
        return `<tr>
            <td>${escapeHtml(entry.name)}</td>
            <td class="text-end">${format(entry.baselineAverage.totalDamage)}</td>
            <td class="text-end">${format(entry.variantAverage.totalDamage)}</td>
            <td class="text-end ${diffClass}">${entry.diff >= 0 ? "+" : ""}${format(entry.diff)}</td>
            <td class="text-end ${diffClass}">${entry.diffPercent >= 0 ? "+" : ""}${entry.diffPercent.toFixed(2)}%</td>
            <td class="text-end">${entry.runs}</td>
        </tr>`;
    }).join("");
}

function renderAblationPanel() {
    const target = document.getElementById("baselineAblationPanel");
    if (!target) return;
    const baselineText = ablationState.baseline
        ? tr("baselineSaved", {
            boss: bossLabel(ablationState.baseline.bossIndex),
            count: participantCountFromTemplates(ablationState.baseline.templates),
        })
        : tr("noBaseline");
    const progressPercent = ablationState.progress
        ? Math.min(100, Math.max(0, ((ablationState.progress.completed + ablationState.progress.currentProgress) / ablationState.progress.total) * 100))
        : 0;
    const progressText = ablationState.progress
        ? tr("ablationProgress", {
            label: ablationState.progress.label,
            run: ablationState.progress.run,
            runs: ablationState.progress.runs,
            done: ablationState.progress.completed,
            total: ablationState.progress.total,
        })
        : "";
    const presetOptions = ablationOptions().map((option) => `
        <option value="${escapeHtml(option.value)}" ${ablationState.selectedPresetIds.includes(option.value) ? "selected" : ""}>
            ${escapeHtml(option.label)}
        </option>
    `).join("");
    const selectHint = ablationState.mode === "reduction" && !presetOptions
        ? `<div class="small text-muted mt-1">${tr("noReductionPresets")}</div>`
        : "";

    target.innerHTML = `
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h5 class="mb-0">${tr("baselineAblation")}</h5>
            <span class="small ${ablationState.baseline ? "text-success" : "text-muted"}">${escapeHtml(baselineText)}</span>
        </div>
        <div class="ablation-grid">
            <div>
                <label class="form-label" for="ablationMode">${tr("ablationMode")}</label>
                <select id="ablationMode" class="form-select" ${ablationState.isRunning ? "disabled" : ""}>
                    <option value="increment" ${ablationState.mode === "increment" ? "selected" : ""}>${tr("ablationModeIncrement")}</option>
                    <option value="reduction" ${ablationState.mode === "reduction" ? "selected" : ""}>${tr("ablationModeReduction")}</option>
                </select>
            </div>
            <div>
                <label class="form-label" for="ablationBoss">${tr("ablationBoss")}</label>
                <select id="ablationBoss" class="form-select" ${ablationState.isRunning ? "disabled" : ""}>
                    <option value="0" ${ablationState.targetBossIndex === 0 ? "selected" : ""}>${tr("leftBoss")}</option>
                    <option value="1" ${ablationState.targetBossIndex === 1 ? "selected" : ""}>${tr("rightBoss")}</option>
                </select>
            </div>
            <div>
                <label class="form-label" for="ablationRuns">${tr("ablationRuns")}</label>
                <input id="ablationRuns" class="form-control" type="number" min="1" max="100" value="${Number(ablationState.runs) || 1}" ${ablationState.isRunning ? "disabled" : ""}>
            </div>
            <div>
                <label class="form-label" for="ablationConcurrency">${tr("ablationConcurrency")}</label>
                <input id="ablationConcurrency" class="form-control" type="number" min="1" max="16" value="${Number(ablationState.concurrency) || 1}" ${ablationState.isRunning ? "disabled" : ""}>
            </div>
            <div>
                <button id="storeBaseline" class="btn btn-outline-primary w-100" ${ablationState.isRunning ? "disabled" : ""}>${tr("storeBaseline")}</button>
            </div>
            <div>
                <button id="runAblation" class="btn btn-primary w-100" ${ablationState.isRunning ? "disabled" : ""}>${ablationState.isRunning ? tr("ablationRunning") : tr("runAblation")}</button>
            </div>
        </div>
        <div class="mt-3">
            <label class="form-label" for="ablationPresets">${tr(ablationState.mode === "reduction" ? "ablationReductions" : "ablationIncrements")}</label>
            <select id="ablationPresets" class="form-select" multiple size="6" ${ablationState.isRunning ? "disabled" : ""}>
                ${presetOptions}
            </select>
            ${selectHint}
        </div>
        ${ablationState.progress ? `
            <div class="progress mt-3">
                <div class="progress-bar progress-bar-striped progress-bar-animated" style="width:${progressPercent}%">${escapeHtml(progressText)}</div>
            </div>
        ` : ""}
        ${ablationState.error ? `<div class="text-danger small mt-2">${escapeHtml(ablationState.error)}</div>` : ""}
        <div class="table-responsive ablation-results mt-3">
            <table class="table table-sm table-bordered align-middle mb-0">
                <thead class="table-light"><tr>
                    <th>${tr("ablationPreset")}</th>
                    <th class="text-end">${tr("baselineAverage")}</th>
                    <th class="text-end">${tr("variantAverage")}</th>
                    <th class="text-end">${tr("damageDiff")}</th>
                    <th class="text-end">${tr("damageDiffPercent")}</th>
                    <th class="text-end">${tr("ablationRuns")}</th>
                </tr></thead>
                <tbody>${ablationResultRows()}</tbody>
            </table>
        </div>
    `;
}

function saveAndRender() {
    saveState();
    renderPresetGroups();
    renderBosses();
    renderCombinedResult();
    renderSimulationResultTools();
    renderAllocationPanel();
    renderAblationPanel();
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

function isEditingApiPreset() {
    return isApiPreset(editorDraft);
}

function apiEquipmentOptionsForSlot(slot) {
    return editorDraft?.constraints?.equipmentBySlot?.[slot] || [];
}

function apiEquipmentEnhancement(slot, itemHrid) {
    return apiEquipmentOptionsForSlot(slot).find((item) => item.itemHrid === itemHrid)?.enhancementLevel ?? 0;
}

function apiEquipmentOptionsHtml(slot, value, allItems) {
    const owned = apiEquipmentOptionsForSlot(slot);
    const ownedHrids = new Set(owned.map((item) => item.itemHrid));
    const ownedOptions = owned.map((item) => {
        const detail = itemsMap[item.itemHrid];
        const name = localizedName("itemNames", detail) || item.itemHrid;
        const label = `★ ${name} +${Number(item.enhancementLevel) || 0}`;
        return `<option value="${escapeHtml(item.itemHrid)}" ${item.itemHrid === value ? "selected" : ""}>${escapeHtml(label)}</option>`;
    }).join("");
    const otherOptions = allItems
        .filter((item) => !ownedHrids.has(item.hrid))
        .map((item) => `<option value="${escapeHtml(item.hrid)}" ${item.hrid === value ? "selected" : ""}>${escapeHtml(localizedName("itemNames", item))}</option>`)
        .join("");
    return `
        ${ownedOptions ? `<optgroup label="${escapeHtml(tr("ownedOptions"))}">${ownedOptions}</optgroup>` : ""}
        <optgroup label="${escapeHtml(tr("allOptions"))}">${otherOptions}</optgroup>
    `;
}

function apiAbilityOptionsForSlot(abilityIndex) {
    return (editorDraft?.constraints?.abilities || [])
        .filter((ability) => Boolean(abilitiesMap[ability.abilityHrid]?.isSpecialAbility) === (abilityIndex === 0));
}

function apiAbilityLevel(abilityHrid) {
    return (editorDraft?.constraints?.abilities || [])
        .find((ability) => ability.abilityHrid === abilityHrid)?.level ?? 1;
}

function apiAbilityOptionsHtml(abilityIndex, value, allAbilities) {
    const owned = apiAbilityOptionsForSlot(abilityIndex);
    const ownedHrids = new Set(owned.map((ability) => ability.abilityHrid));
    const ownedOptions = owned.map((ability) => {
        const detail = abilitiesMap[ability.abilityHrid];
        const name = localizedName("abilityNames", detail) || ability.abilityHrid;
        const label = `★ ${name} Lv.${Number(ability.level) || 1}`;
        return `<option value="${escapeHtml(ability.abilityHrid)}" ${ability.abilityHrid === value ? "selected" : ""}>${escapeHtml(label)}</option>`;
    }).join("");
    const otherOptions = allAbilities
        .filter((ability) => !ownedHrids.has(ability.hrid))
        .map((ability) => `<option value="${escapeHtml(ability.hrid)}" ${ability.hrid === value ? "selected" : ""}>${escapeHtml(localizedName("abilityNames", ability))}</option>`)
        .join("");
    return `
        ${ownedOptions ? `<optgroup label="${escapeHtml(tr("ownedOptions"))}">${ownedOptions}</optgroup>` : ""}
        <optgroup label="${escapeHtml(tr("allOptions"))}">${otherOptions}</optgroup>
    `;
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
    const isApi = isEditingApiPreset();
    const isReviewed = isReviewedPreset(editorDraft);
    const reviewedTags = sanitizeReviewedTags(editorDraft.reviewedTags || editableTagsForPreset(editorDraft));
    const target = document.getElementById("presetEditor");
    target.innerHTML = `
        <div class="editor-backdrop">
            <section class="editor-dialog">
                <header class="d-flex align-items-center gap-2 p-3 border-bottom bg-light">
                    <input id="editorName" class="form-control" value="${escapeHtml(editorDraft.name)}" placeholder="${tr("presetName")}">
                    <select id="editorType" class="form-select" style="max-width:150px" ${isApi || isReviewed ? "disabled" : ""}>
                        <option value="fixed" ${editorDraft.type === "fixed" ? "selected" : ""}>${tr("fixedPresets")}</option>
                        <option value="reviewed" ${editorDraft.type === "reviewed" ? "selected" : ""}>${tr("reviewedPresets")}</option>
                        <option value="default" ${editorDraft.type === "default" ? "selected" : ""}>${tr("defaultPresets")}</option>
                    </select>
                    <button class="btn-close" data-editor-action="close"></button>
                </header>
                <div class="editor-body p-3">
                    ${(editorDraft.type === "fixed" || isReviewed) ? `<section class="editor-section mb-3">
                        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                            <div>
                                <h5 class="mb-1">${tr("tagEditorTitle")}</h5>
                                <p class="small text-muted mb-0">${tr("tagEditorHint")}</p>
                            </div>
                            ${editorDraft.type === "fixed" ? `<button class="btn btn-outline-info btn-sm" data-editor-action="add-reviewed">${tr("addToReviewed")}</button>` : ""}
                        </div>
                        ${reviewedTagCheckboxesHtml(reviewedTags)}
                        <div id="editorReviewedMessage" class="small mt-2"></div>
                    </section>` : ""}
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
                                        ${isApi ? apiEquipmentOptionsHtml(slot, selected?.itemHrid, items) : optionsHtml(items, selected?.itemHrid, "itemNames")}
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
                                                ${isApi ? apiAbilityOptionsHtml(abilityIndex, ability.abilityHrid, slotAbilities) : optionsHtml(slotAbilities, ability.abilityHrid, "abilityNames")}
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
    document.querySelector(".editor-backdrop")?.addEventListener("click", (event) => {
        if (event.target === event.currentTarget) closeEditor();
    });
    document.getElementById("editorName").addEventListener("input", (event) => editorDraft.name = event.target.value);
    document.getElementById("editorType").addEventListener("change", (event) => editorDraft.type = event.target.value);
    document.querySelectorAll("[data-level]").forEach((input) => input.addEventListener("input", () => {
        editorDraft.build.player[`${input.dataset.level}Level`] = Number(input.value);
    }));
    document.querySelectorAll("[data-equipment]").forEach((select) => select.addEventListener("change", () => {
        const slot = select.dataset.equipment;
        const index = editorDraft.build.player.equipment.findIndex((item) => item.itemLocationHrid === `/item_locations/${slot}`);
        const owned = ownedEquipmentForPresetSlot(editorDraft, slot, select.value);
        if (!select.value) {
            if (index >= 0) editorDraft.build.player.equipment.splice(index, 1);
        } else {
            const equipment = {
                itemLocationHrid: `/item_locations/${slot}`,
                itemHrid: select.value,
                enhancementLevel: owned ? Number(owned.enhancementLevel) || 0 : (index >= 0 ? editorDraft.build.player.equipment[index].enhancementLevel : 0),
            };
            if (index >= 0) editorDraft.build.player.equipment[index] = equipment;
            else editorDraft.build.player.equipment.push(equipment);
            if (conflictingEquipmentSlots(slot).length) {
                editorDraft.build.player.equipment = editorDraft.build.player.equipment
                    .filter((item) => !conflictingEquipmentSlots(slot).includes(equipmentSlot(item)));
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
        ability.level = Math.max(
            Number(ability.level) || 1,
            ownedAbilityLevelForPreset(editorDraft, select.value) || 1,
        );
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
    syncPresetToOwnedApiValues(editorDraft);
    editorDraft.reviewedTags = sanitizeReviewedTags(editableTagsForPreset(preset));
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

function groupedTemplatesFromSlots(slots) {
    const counts = slots.filter(Boolean)
        .reduce((map, id) => map.set(id, (map.get(id) || 0) + 1), new Map());
    return [...counts].map(([id, count]) => {
        const preset = state.presets.find((item) => item.id === id);
        if (!preset) return null;
        return clone({ name: preset.name, count, build: preset.build });
    }).filter(Boolean);
}

function groupedTemplates(boss) {
    return groupedTemplatesFromSlots(boss.slots);
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

function runTemplatesOnce({ encounterHrid, settings, templates }, onProgress = () => {}) {
    if (!templates.length) {
        return Promise.resolve({
            points: 0,
            layersCompleted: 0,
            currentLevel: settings.startLevel,
            participantCount: 0,
            totalDamage: 0,
            templateStats: {},
        });
    }
    return new Promise((resolve, reject) => {
        const worker = new Worker(new URL("../guildTrialWorker.js", import.meta.url));
        worker.onmessage = ({ data }) => {
            if (data.type === "guild_trial_progress") {
                onProgress(data);
            }
            if (data.type === "guild_trial_result") {
                worker.terminate();
                resolve(data.result);
            }
            if (data.type === "guild_trial_error") {
                worker.terminate();
                reject(new Error(data.error));
            }
        };
        worker.onerror = (event) => {
            worker.terminate();
            reject(new Error(event.message));
        };
        worker.postMessage(clone({
            type: "start_guild_trial",
            encounterHrid,
            startLevel: settings.startLevel,
            maxLevel: Math.max(settings.startLevel, settings.maxLevel),
            timeLimitSeconds: settings.timeLimitMinutes * 60,
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
    error.className = "text-danger me-auto";
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
        renderSimulationResultTools();
    }
}

function storeAblationBaseline() {
    const bossIndex = ablationState.targetBossIndex;
    const boss = state.bosses[bossIndex];
    const templates = groupedTemplates(boss);
    ablationState.baseline = {
        bossIndex,
        encounterHrid: boss.encounterHrid,
        settings: clone(state.settings),
        slots: clone(boss.slots),
        templates,
        referenceResult: boss.result ? clone(boss.result) : null,
        savedAt: Date.now(),
    };
    ablationState.error = "";
    ablationState.progress = null;
    ablationState.results = [];
    ablationState.selectedPresetIds = [];
    renderAblationPanel();
}

function reducedTemplatesForIndex(baseline, templateIndex) {
    const templates = clone(baseline.templates);
    const template = templates[templateIndex];
    if (!template) return null;
    template.count = Math.max(0, Number(template.count || 0) - 1);
    return templates.filter((item) => Number(item.count || 0) > 0);
}

async function runRepeatedTrial(label, runCount, templates, completedBefore, totalRuns, baseline) {
    const results = Array(runCount);
    const concurrency = Math.min(runCount, Math.max(1, Math.floor(Number(ablationState.concurrency) || 1)));
    const progressByRun = new Map();
    let nextIndex = 0;
    let completedCount = 0;
    let firstError = null;

    const updateProgress = () => {
        const activeProgress = [...progressByRun.values()].reduce((total, value) => total + value, 0);
        ablationState.progress = {
            label,
            run: completedCount,
            runs: runCount,
            completed: completedBefore + completedCount,
            total: totalRuns,
            currentProgress: activeProgress,
        };
        renderAblationPanel();
    };

    const runNext = async () => {
        while (nextIndex < runCount && !firstError) {
            const runIndex = nextIndex;
            nextIndex += 1;
            progressByRun.set(runIndex, 0);
            updateProgress();
            try {
                results[runIndex] = await runTemplatesOnce({
                    encounterHrid: baseline.encounterHrid,
                    settings: baseline.settings,
                    templates,
                }, (progress) => {
                    const range = Math.max(10, baseline.settings.maxLevel - baseline.settings.startLevel);
                    progressByRun.set(runIndex, Math.min(1, Math.max(0, (progress.currentLevel - baseline.settings.startLevel) / range)));
                    updateProgress();
                });
            } catch (error) {
                firstError ||= error;
            } finally {
                progressByRun.delete(runIndex);
                completedCount += 1;
                updateProgress();
            }
        }
    };

    updateProgress();
    await Promise.all(Array.from({ length: concurrency }, runNext));
    if (firstError) throw firstError;
    renderAblationPanel();
    return results.filter(Boolean);
}

async function runAblation() {
    if (!ablationState.baseline) {
        ablationState.error = tr("noBaseline");
        renderAblationPanel();
        return;
    }
    const selectedItems = ablationState.mode === "reduction"
        ? ablationState.selectedPresetIds
            .map((value) => {
                const index = Number(value);
                const template = ablationState.baseline.templates[index];
                return template ? { id: value, name: template.name, templateIndex: index } : null;
            })
            .filter(Boolean)
        : ablationState.selectedPresetIds
            .map((id) => state.presets.find((preset) => preset.id === id))
            .filter(Boolean);
    if (!selectedItems.length) {
        ablationState.error = tr("noAblationPresets");
        renderAblationPanel();
        return;
    }
    if (ablationState.mode === "increment" && participantCountFromTemplates(ablationState.baseline.templates) >= state.settings.rosterLimit) {
        ablationState.error = tr("baselineFull");
        renderAblationPanel();
        return;
    }

    const runs = Math.max(1, Math.floor(Number(ablationState.runs) || 1));
    const totalRuns = (selectedItems.length + 1) * runs;
    ablationState.isRunning = true;
    ablationState.error = "";
    ablationState.results = [];
    renderAblationPanel();

    try {
        const baseline = clone(ablationState.baseline);
        const baselineRuns = await runRepeatedTrial(tr("ablationBaselineLabel"), runs, baseline.templates, 0, totalRuns, baseline);
        const baselineAverage = averageResults(baselineRuns);
        for (const [itemIndex, item] of selectedItems.entries()) {
            const templates = ablationState.mode === "reduction"
                ? reducedTemplatesForIndex(baseline, item.templateIndex)
                : [...clone(baseline.templates), clone({ name: item.name, count: 1, build: item.build })];
            if (!templates) continue;
            const completedBefore = (itemIndex + 1) * runs;
            const variantRuns = await runRepeatedTrial(item.name, runs, templates, completedBefore, totalRuns, baseline);
            const variantAverage = averageResults(variantRuns);
            const diff = variantAverage.totalDamage - baselineAverage.totalDamage;
            const diffPercent = baselineAverage.totalDamage ? (diff / baselineAverage.totalDamage) * 100 : 0;
            ablationState.results.push({
                id: item.id,
                name: item.name,
                runs,
                mode: ablationState.mode,
                baselineAverage,
                variantAverage,
                diff,
                diffPercent,
            });
            renderAblationPanel();
        }
        ablationState.progress = null;
    } catch (error) {
        ablationState.error = tr("ablationFailed", { message: error.message });
    } finally {
        ablationState.isRunning = false;
        renderAblationPanel();
    }
}

function openApiImportModal(action = "import") {
    apiModalAction = action;
    const input = document.getElementById("apiImportUrl");
    const message = document.getElementById("apiImportMessage");
    if (input) input.value = "";
    if (message) {
        message.className = "small mt-2";
        message.textContent = "";
    }
    bootstrap.Modal.getOrCreateInstance(document.getElementById("apiImportModal")).show();
}

async function fetchApiPayloadFromModal() {
    const input = document.getElementById("apiImportUrl");
    const message = document.getElementById("apiImportMessage");
    const button = document.getElementById("fetchApiImport");
    const apiUrl = input.value.trim();
    if (!apiUrl) {
        message.className = "small mt-2 text-danger";
        message.textContent = tr("apiUrlRequired");
        return;
    }
    button.disabled = true;
    message.className = "small mt-2 text-muted";
    message.textContent = tr("importingApiBuilds");
    try {
        const response = await fetch(apiUrl, { cache: "no-store" });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        apiPayloadCache = await response.json();
        input.value = "";
        if (apiModalAction === "export") {
            bootstrap.Modal.getOrCreateInstance(document.getElementById("apiImportModal")).hide();
            await exportAbAssignments();
        } else {
            await importApiBuilds(apiPayloadCache);
            bootstrap.Modal.getOrCreateInstance(document.getElementById("apiImportModal")).hide();
        }
    } catch (error) {
        message.className = "small mt-2 text-danger";
        message.textContent = tr("apiBuildImportFailed", { message: error.message });
    } finally {
        button.disabled = false;
    }
}

async function importApiBuilds(payload) {
    const button = document.getElementById("importApiBuilds");
    const message = document.getElementById("runError");
    button.disabled = true;
    button.textContent = tr("importingApiBuilds");
    message.className = "text-muted me-auto";
    message.textContent = tr("importingApiBuilds");
    try {
        const presets = presetsFromApiPayload(payload);
        if (!presets.length) {
            throw new Error(tr("missingApiLoadout"));
        }
        const oldApiPresets = state.presets.filter(isApiSourcePreset);
        const oldApiByName = new Map(oldApiPresets.map((preset) => [preset.name, preset]));
        const importedPresets = presets.map((preset) => {
            const previous = oldApiByName.get(preset.name);
            return previous ? { ...mergeManualApiValues(preset, previous), id: previous.id } : preset;
        });
        const oldApiIds = new Set(oldApiPresets.map((preset) => preset.id));
        const importedApiIds = new Set(importedPresets.map((preset) => preset.id));
        state.presets = [
            ...state.presets.filter((preset) => !isApiSourcePreset(preset)),
            ...importedPresets,
        ];
        state.bosses.forEach((boss) => {
            boss.slots = boss.slots.map((presetId) =>
                oldApiIds.has(presetId) && !importedApiIds.has(presetId) ? null : presetId);
            boss.result = null;
            boss.progress = null;
        });
        saveAndRender();
        message.className = "text-success me-auto";
        message.textContent = tr("importedApiBuilds", { count: presets.length });
    } catch (error) {
        message.className = "text-danger me-auto";
        message.textContent = tr("apiBuildImportFailed", { message: error.message });
    } finally {
        button.disabled = false;
        button.textContent = tr("importApiBuilds");
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
    document.getElementById("importApiBuilds").addEventListener("click", () => openApiImportModal("import"));
    document.getElementById("fetchApiImport").addEventListener("click", fetchApiPayloadFromModal);
    document.getElementById("exportCompressedPresets").addEventListener("click", exportCompressedPresets);
    document.getElementById("importCompressedPresets").addEventListener("click", importCompressedPresets);
    document.getElementById("exportAllocationConfig").addEventListener("click", exportAllocationConfigTransfer);
    document.getElementById("importAllocationConfig").addEventListener("click", importAllocationConfigTransfer);
    document.getElementById("exportAbAssignments").addEventListener("click", exportAbAssignments);
    document.getElementById("mergeAbManualAssignments").addEventListener("click", mergeAbManualAssignments);
    document.getElementById("bulkDeletePresets").addEventListener("click", () => setBulkDeleteEnabled(true));
    document.getElementById("clearInsanityRevive").addEventListener("click", clearAllInsanityRevive);
    for (const [id, field] of [["startLevel", "startLevel"], ["maxLevel", "maxLevel"], ["timeLimit", "timeLimitMinutes"]]) {
        document.getElementById(id).addEventListener("change", (event) => {
            state.settings[field] = Number(event.target.value);
            saveState();
        });
    }
    document.getElementById("rosterLimit").addEventListener("change", (event) => {
        updateRosterLimit(event.target.value);
        saveAndRender();
    });
    document.addEventListener("contextmenu", (event) => {
        if (bulkDeleteState.enabled) {
            event.preventDefault();
            return;
        }
        const rosterSlot = event.target.closest(".roster-slot");
        if (rosterSlot) {
            const presetId = state.bosses[Number(rosterSlot.dataset.bossIndex)]
                ?.slots?.[Number(rosterSlot.dataset.slotIndex)];
            const preset = state.presets.find((item) => item.id === presetId);
            if (preset) {
                event.preventDefault();
                hidePresetContextMenu();
                openEditor(preset);
            }
            return;
        }
        const presetCard = event.target.closest(".preset-card");
        if (!presetCard) {
            hidePresetContextMenu();
            return;
        }
        event.preventDefault();
        showPresetContextMenu(presetCard.dataset.presetId, event.clientX, event.clientY);
    });
    document.addEventListener("dragover", (event) => {
        updateDragAutoScroll(event.clientY);
    });
    document.addEventListener("drop", stopDragAutoScroll);
    document.addEventListener("dragend", stopDragAutoScroll);
    document.addEventListener("click", (event) => {
        const contextAction = event.target.closest("[data-context-action]");
        if (contextAction) {
            const id = contextAction.dataset.presetId;
            const preset = state.presets.find((item) => item.id === id);
            if (contextAction.dataset.contextAction === "copy" && preset) {
                const copied = clone(preset);
                copied.id = createId();
                copied.name = `${preset.name} ${tr("copySuffix")}`;
                delete copied.source;
                delete copied.constraints;
                delete copied.sourcePresetId;
                delete copied.sourceSnapshotHash;
                delete copied.reviewedTags;
                copied.type = "fixed";
                const index = state.presets.findIndex((item) => item.id === id);
                state.presets.splice(index + 1, 0, copied);
            }
            if (contextAction.dataset.contextAction === "delete") {
                state.presets = state.presets.filter((item) => item.id !== id && item.sourcePresetId !== id);
                state.bosses.forEach((boss) => {
                    boss.slots = boss.slots.map((slot) => slot === id ? null : slot);
                });
            }
            hidePresetContextMenu();
            saveAndRender();
            return;
        }
        hidePresetContextMenu();
        if (event.target.closest("#cancelBulkDelete")) {
            setBulkDeleteEnabled(false);
            return;
        }
        if (event.target.closest("#selectAllPresets")) {
            selectAllVisiblePresets();
            return;
        }
        if (event.target.closest("#clearSelectedPresets")) {
            clearBulkDeleteSelection();
            return;
        }
        if (event.target.closest("#deleteSelectedPresets")) {
            if (window.confirm(tr("confirmBulkDelete", { count: bulkDeleteState.selectedIds.length }))) {
                deleteSelectedPresets();
            }
            return;
        }
        const editorAction = event.target.closest("[data-editor-action]");
        if (editorAction) {
            if (editorAction.dataset.editorAction === "close") closeEditor();
            if (editorAction.dataset.editorAction === "save") {
                if (document.querySelector("[data-reviewed-tag]")) {
                    editorDraft.reviewedTags = reviewedTagsFromEditor();
                }
                if (isReviewedPreset(editorDraft)) {
                    const source = state.presets.find((preset) => preset.id === editorDraft.sourcePresetId);
                    if (source) {
                        editorDraft.name = source.name;
                        editorDraft.build = clone(source.build);
                        editorDraft.constraints = source.constraints ? clone(source.constraints) : undefined;
                        editorDraft.source = source.source;
                        editorDraft.sourceSnapshotHash = sourceSnapshotHash(source);
                    }
                }
                syncGeneratedBaseNameFromManualName(editorDraft);
                const index = state.presets.findIndex((preset) => preset.id === editingId);
                if (index >= 0) state.presets[index] = clone(editorDraft);
                closeEditor();
                saveAndRender();
            }
            if (editorAction.dataset.editorAction === "add-reviewed") {
                upsertReviewedFromEditor();
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
            if (bulkDeleteState.enabled) {
                toggleBulkDeletePreset(presetCard.dataset.presetId, event);
                return;
            }
            const preset = state.presets.find((item) => item.id === presetCard.dataset.presetId);
            if (preset) openEditor(preset);
            return;
        }
        const action = event.target.closest("[data-action]");
        if (action?.dataset.action === "random-fill") fillRandomDefaults(Number(action.dataset.bossIndex));
        if (action?.dataset.action === "clear-roster") {
            state.bosses[Number(action.dataset.bossIndex)].slots = Array(state.settings.rosterLimit).fill(null);
            saveAndRender();
        }
        if (action?.dataset.action === "sort-stats") {
            const boss = state.bosses[Number(action.dataset.bossIndex)];
            const field = action.dataset.sortField;
            const current = boss.statsSort || {};
            boss.statsSort = {
                field,
                direction: current.field === field && current.direction === "desc" ? "asc" : "desc",
            };
            renderBosses();
            return;
        }
        if (event.target.closest("#storeBaseline")) {
            storeAblationBaseline();
            return;
        }
        if (event.target.closest("#runAblation")) {
            runAblation();
            return;
        }
        if (event.target.closest("#runApiAllocation")) {
            runApiAllocation();
            return;
        }
        if (event.target.closest("#openAllocationConfig")) {
            openAllocationConfigModal();
            return;
        }
        const allocationConfigAction = event.target.closest("[data-allocation-config-action]");
        if (allocationConfigAction) {
            const actionName = allocationConfigAction.dataset.allocationConfigAction;
            const bossSection = allocationConfigAction.closest("[data-allocation-boss]");
            if (actionName === "add-survival") {
                bossSection.querySelector("[data-allocation-survival-body]")
                    .insertAdjacentHTML("beforeend", allocationSurvivalRowHtml());
            }
            if (actionName === "add-score") {
                bossSection.querySelector("[data-allocation-score-body]")
                    .insertAdjacentHTML("beforeend", allocationScoreRowHtml());
            }
            if (actionName === "remove-row") {
                allocationConfigAction.closest("tr")?.remove();
            }
            return;
        }
        if (event.target.closest("#saveAllocationConfig")) {
            state.allocationConfig = allocationConfigFromEditor();
            allocationState.result = null;
            allocationState.message = tr("allocationConfigSaved");
            saveState();
            renderAllocationPanel();
            renderAllocationConfigEditor();
            const message = document.getElementById("allocationConfigMessage");
            if (message) {
                message.className = "small mt-2 text-success";
                message.textContent = tr("allocationConfigSaved");
            }
            return;
        }
        if (event.target.closest("#openAllocationConfigTransfer")) {
            openAllocationConfigTransferModal();
            return;
        }
        if (event.target.closest("#importAblationAllocationConfig")) {
            importAblationResultsToAllocationConfig();
            return;
        }
        if (event.target.closest("#applyApiAllocation")) {
            applyApiAllocation();
            return;
        }
        if (event.target.closest("#assignInsanityRevive")) {
            assignInsanityReviveFromResults();
            return;
        }
        const slot = event.target.closest(".roster-slot");
        if (slot && state.bosses[Number(slot.dataset.bossIndex)].slots[Number(slot.dataset.slotIndex)]) {
            state.bosses[Number(slot.dataset.bossIndex)].slots[Number(slot.dataset.slotIndex)] = null;
            saveAndRender();
        }
    });
    document.addEventListener("change", (event) => {
        if (event.target.id === "ablationMode") {
            ablationState.mode = event.target.value === "reduction" ? "reduction" : "increment";
            ablationState.selectedPresetIds = [];
            ablationState.results = [];
            ablationState.error = "";
            renderAblationPanel();
            return;
        }
        if (event.target.id === "ablationBoss") {
            ablationState.targetBossIndex = Number(event.target.value) || 0;
            renderAblationPanel();
            return;
        }
        if (event.target.id === "ablationRuns") {
            ablationState.runs = Math.max(1, Math.floor(Number(event.target.value) || 1));
            renderAblationPanel();
            return;
        }
        if (event.target.id === "ablationConcurrency") {
            ablationState.concurrency = Math.min(16, Math.max(1, Math.floor(Number(event.target.value) || 1)));
            renderAblationPanel();
            return;
        }
        if (event.target.id === "ablationPresets") {
            ablationState.selectedPresetIds = [...event.target.selectedOptions].map((option) => option.value);
            renderAblationPanel();
            return;
        }
        if (event.target.id === "insanityWeight") {
            const insanityWeight = Math.max(0, Math.min(1, Number(event.target.value) || 0));
            setInsanityReviveWeights(insanityWeight, 1 - insanityWeight);
            renderSimulationResultTools();
            return;
        }
        if (event.target.id === "reviveWeight") {
            const reviveWeight = Math.max(0, Math.min(1, Number(event.target.value) || 0));
            setInsanityReviveWeights(1 - reviveWeight, reviveWeight);
            renderSimulationResultTools();
            return;
        }
        if (event.target.id === "shieldUsesInvincible") {
            insanityReviveState.shieldUsesInvincible = event.target.checked;
            renderSimulationResultTools();
            return;
        }
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
    document.getElementById("rosterLimit").value = state.settings.rosterLimit;
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
        renderSimulationResultTools();
        renderAllocationPanel();
        renderAblationPanel();
        if (editorDraft) {
            renderEditor(editorScroll);
            if (jsonText != null) document.getElementById("editorJson").value = jsonText;
        }
        setTimeout(() => {
            document.title = tr("title");
        }, 0);
    });
}

window.addEventListener("beforeunload", () => {
    workers.forEach((worker) => worker?.terminate());
    allocationWorker?.terminate();
});
window.addEventListener("DOMContentLoaded", init);
