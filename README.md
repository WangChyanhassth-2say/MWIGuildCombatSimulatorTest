# MWI Guild Combat Simulator

Milky Way Idle 公会战斗试炼阵容模拟器，支持使用角色预设为两只当期 Boss 分配最多 40 名参战者并分别统计模拟结果。

在线使用：

https://wangchyanhassth-2say.github.io/MWIGuildCombatSimulatorTest/

## 主要功能

- 固定预设和默认预设管理
- 两支最多 40 人的 Boss 阵容
- 等级、装备、技能和 Trigger 配置
- 试炼逐层战斗、积分与模板统计
- 中英文界面
- JSON 导入与导出

## 本地开发

```bash
npm install
npm start
```

构建静态文件：

```bash
npm run build
```

生成结果位于 `dist/`。GitHub Pages 会在推送到 `main` 后自动构建和部署。

## 致谢

本项目基于 MWI Combat Simulator 的战斗模拟核心进行扩展。原项目版权和许可信息见 `LICENSE`。