# Project config

## Identity

- Name: Petit Monde Vivant
- Stack: Phaser 4, TypeScript, Vite
- Current shape: small gameplay prototype
- Long-term vision: a living medieval world where the player observes a society evolving over several years.

## Current prototype

- The player observes and clicks places.
- One activity can be active at a time.
- Places currently available: Foret, Mine, Village.
- Foret produces wood every 2 seconds while active.
- Mine produces stone every 2 seconds while active.
- Village stops production.
- The current activity, resources, day, next-day countdown, and world chronicles are visible.
- A regional projects section shows the first project: `Réparer le vieux pont`.
- A daily `Travail de bûcheron` button starts a simple 5-attempt timing action once per day when `forestCurrent >= 10`, without changing the current activity.
- The game saves automatically with `localStorage`.
- A reset button clears the save state.

## World resources

- Player resources: wood, stone.
- Global forest stock is stored as `forestCurrent` and `forestMax`.
- `forestCurrent` starts at 100.
- `forestMax` starts at 100.
- Active Foret production gives +1 wood and removes 1 `forestCurrent` every 2 seconds.
- Forest regenerates by +1 every 10 seconds, up to `forestMax`.
- Foret becomes unavailable when `forestCurrent` reaches 0, while staying visible as exhausted.
- Forest depletion thresholds already triggered are stored in `GameState` and saved with the game state.
- The daily woodcutter work gives either +10 wood and -10 `forestCurrent` after at least 3 successful hits out of 5, or +3 wood and -3 `forestCurrent` otherwise.

## Chronicles

- One day passes every 30 seconds.
- A random chronicle event is generated each new day.
- The 20 latest chronicle events are displayed, newest first.
- Forest depletion can add threshold chronicle messages once for each threshold: below 50, below 20, and 0.
- Regional project milestones can add chronicle messages when their saved day counters reach 0.
- Chronicle events are narrative only unless a future task explicitly says otherwise.

## Regional projects

- Regional project state is stored separately in `RegionalProjects` and saved with `localStorage`.
- The first regional project is `Réparer le vieux pont`.
- It costs 50 wood to fund.
- Status values are not started, in progress, and completed.
- The old bridge project stores remaining days until the bridge is passable and until merchants seem more numerous on the road.
- Funding the old bridge removes 50 wood and adds a chronicle.
- Three days after funding, the old bridge becomes passable through a chronicle event.
- Three additional days later, merchants seem more numerous on the road through a chronicle event, and the project is completed.
- These events are narrative only and do not create merchants, NPCs, markets, economy, or new gameplay.

## Architecture

- `src/scenes`: Phaser scenes and scene-level orchestration.
- `src/systems`: state, persistence, chronicle, and world logic.
- `src/ui`: HUD and UI display.
- `src/systems/RegionalProjects.ts`: saved regional project status and day-based milestone progression.
- `src/systems/DailyWork.ts`: saved once-per-day work availability for the woodcutter job.

## Current constraints

- No NPCs.
- No movement.
- No combat.
- No complex inventory.
- No skill tree.
- No market.
- No quest system.
- No complex economy.
- No external assets.
- No new locations without an explicit task.
