# Changelog

## 2026-06-02

- Kept the current activity running when `Travail de bûcheron` starts, so the daily work no longer switches the game to Village.
- Added the saved daily `Travail de bûcheron` job, gated by `forestCurrent >= 10` and one launch per current day.
- Added a simple Phaser timing mini-game with 5 attempts, a moving cursor, a central success zone, click input, and Space input.
- Wired woodcutter job rewards to add either 10 or 3 wood, reduce `forestCurrent` by the same amount, trigger existing forest depletion chronicles, and add the requested work chronicle.
- Updated `project.config.md` with the daily woodcutter work scope and `DailyWork` system.
- Added a saved regional projects system with the first project, `Réparer le vieux pont`, costing 50 wood.
- Added the `Projets régionaux` HUD section with project cost, status, and a disabled funding button until enough wood is available.
- Wired old bridge funding to spend wood, add the start chronicle, advance two narrative milestones over six days, and reset with the save reset.
- Updated limited forest resource state to use `forestCurrent` and `forestMax`, saved forest threshold flags in `GameState`, and kept forest threshold chronicle events one-shot.
- Added the visible `Forêt épuisée` indication while the forest location is unavailable at 0.
- Updated `project.config.md` with the exact limited forest resource fields and threshold persistence rule.
- Clarified `AGENTS.md` startup rules so future agents read `project.config.md` and `changelog.md` at the start of each user request.
- Added `AGENTS.md` with agent workflow rules, code rules, and the mandatory changelog update rule.
- Added `project.config.md` with the general project outline, current prototype scope, architecture, and constraints.
- Initialized `changelog.md` to track future development changes.
