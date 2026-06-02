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
- A HUD speed regulator lets the player run world timers at x1, x2, x3, x4, or x5.
- Foret produces wood every 2 seconds while active.
- Mine produces stone every 2 seconds while active.
- Village stops production.
- The current activity, resources, day, next-day countdown, daily action count, and world chronicles are visible.
- The HUD shows the current season as a compact chip such as `Printemps · Jour 3/10`.
- The HUD favors compact visual information: translucent overlay chips, simple drawn icons, gauges, counters, and minimal text.
- The HUD should keep the map dominant: primary status and actions stay in compact top strips, chronicles show only the latest line, and regional projects use short compact rows.
- HUD and interface elements must not use emoji.
- The current visual layout is a 16:9 game screen with a scrollable top-down green meadow map that fills the canvas and discreet HUD overlays above it instead of opaque side panels.
- The current map background has an empty terrain with subtle grass variation, enhanced by ambient day/night visual overlays, seasonal map tint overlays (light green for spring, golden for summer, warm orange for autumn, frosty white-blue for winter), and seasonal drifting elements (spring petals, summer pollen, autumn leaves/mist, and winter snow).
- Coded dirt paths connect the Village to the old bridge, the Mine, and dynamically to the Forest (the path becomes clearer as the forest road project advances).
- Landmarks are integrated into the meadow terrain with rocky backgrounds (Mine), border bushes (Foret), and rocky abutments at the river crossing (old bridge).
- Interactive landmarks (Foret, Mine) show a brief floating +1 indicator when resources are produced.
- Visual direction: make the map the primary asset and place HUD elements as light overlays above it.
- The map is larger than the viewport and can be panned by dragging or using the mouse wheel, while HUD elements remain fixed above it.
- Visual asset creation is tracked in `create-ai-asset.md`; AI-generated assets should be reviewed there before integration.
- The healthy forest landmark is stored as `public/assets/forest-healthy.png` and loaded by `GameScene`.
- The exhausted forest landmark is stored as `public/assets/forest-exhausted.png` and loaded by `GameScene` when the Foret is unavailable.
- The forest ground blend patch is stored as `public/assets/forest-ground-patch.png` and rendered under the forest landmark.
- The mine entrance landmark is stored as `public/assets/mine-entrance.png` and loaded by `GameScene`.
- The village landmark is stored as `public/assets/village-landmark.png` and loaded by `GameScene`.
- The old bridge landmarks are stored as `public/assets/old-bridge-damaged.png` and `public/assets/old-bridge-repaired.png`, with `GameScene` switching to the repaired version when the old bridge project is completed.
- A regional projects section shows `Réparer le vieux pont`, then unlocks `Tracer une route forestière` and `Étayer l’entrée de la mine` once the old bridge is completed.
- Each day grants 2 saved daily actions that reset at the start of a new day.
- The daily action choices are `Ramasser du bois`, `Travail de bûcheron`, `Extraire de la pierre`, and `Aider le village`.
- A compact village requests section appears when the village has one active local need, with its resource cost, remaining days, and an `Aider` button that also consumes one daily action.
- A daily `Travail de bûcheron` button starts a simple 5-attempt timing action once per day when `forestCurrent >= 10` and at least one daily action remains, without changing the current activity.
- The game saves automatically with `localStorage`.
- A reset button clears the save state.

## World resources

- Player resources: wood, stone.
- Daily actions are stored as `dailyActionsRemaining`, start at 2, reset to 2 each new day, and are saved with `localStorage`.
- Global forest stock is stored as `forestCurrent` and `forestMax`.
- `forestCurrent` starts at 100.
- `forestMax` starts at 100.
- Active Foret production gives +1 wood every 2 seconds.
- Active Mine production gives +1 stone every 2 seconds.
- After `Étayer l’entrée de la mine` is completed, each active Mine production has a 25% chance to add +1 extra stone, so some productions give +2 stone.
- Before `Tracer une route forestière` is completed, each active Foret production removes 1 `forestCurrent`.
- After `Tracer une route forestière` is completed, each active Foret production has only a 50% chance to remove 1 `forestCurrent`.
- `Ramasser du bois` costs 1 daily action and gives up to +6 wood while reducing `forestCurrent` by the same amount, capped by the remaining forest stock.
- `Extraire de la pierre` costs 1 daily action and gives +8 stone.
- Seasons are derived from the current day: 10 days per season, 40 days per year, with a 30-second day making a prototype year about 20 minutes.
- Forest regenerates by +1 up to `forestMax`; seasonal timing is 8 seconds in spring, 10 seconds in summer and autumn, and 15 seconds in winter.
- Foret becomes unavailable when `forestCurrent` reaches 0, while staying visible as exhausted.
- Forest depletion thresholds already triggered are stored in `GameState` and saved with the game state.
- The daily woodcutter work costs 1 daily action at launch, then gives either +10 wood and -10 `forestCurrent` after at least 3 successful hits out of 5, or +3 wood and -3 `forestCurrent` otherwise.

## Chronicles

- One day passes every 30 seconds.
- A random chronicle event is generated each new day.
- A season-change chronicle is added when spring, summer, autumn, or winter begins.
- The 20 latest chronicle events are displayed, newest first.
- Forest depletion can add threshold chronicle messages once for each threshold: below 50, below 20, and 0.
- Regional project milestones can add chronicle messages when their saved day counters reach 0.
- Village requests can add chronicle messages when they appear, when the player completes them, or when they expire.
- Chronicle events are narrative only unless a project effect explicitly grants resources.

## Village requests

- Village request state is stored separately in `VillageRequests` and saved with `localStorage`.
- Only one village request can be active at a time.
- At the start of a new day, an active request loses 1 remaining day; if it reaches 0, it expires and adds its missed-opportunity chronicle.
- When no request is active at the start of a new day, there is a seasonal chance to create one: 50% in summer and winter, 40% in spring and autumn.
- New requests stay active for 2 days and store their request id plus remaining days.
- Completing a request consumes one daily action plus its wood and/or stone cost and adds a positive chronicle.
- Each completed village request increments the saved invisible `villageHelpedCount`.
- Village recognition threshold chronicles trigger once when `villageHelpedCount` reaches 3, 6, and 10, with triggered thresholds saved separately.
- Village request rewards are narrative only for now: no reputation, no market, no new resources, no NPCs, and no new locations.
- Current village requests are `Le fournil manque de bois`, `Réparer un toit avant la pluie`, and `Des pierres pour le vieux puits`.

## Regional projects

- Regional project state is stored separately in `RegionalProjects` and saved with `localStorage`.
- The first regional project is `Réparer le vieux pont`.
- It costs 50 wood to fund.
- Status values are not started, in progress, and completed.
- The old bridge project stores remaining days until the bridge is passable and until merchants seem more numerous on the road.
- Funding the old bridge removes 50 wood and adds a chronicle.
- Three days after funding, the old bridge becomes passable through a chronicle event.
- Three additional days later, merchants seem more numerous on the road through a chronicle event, and the project is completed.
- Once completed, the old bridge opens a passive merchant route effect: each new day has a 30% chance to add a small merchant chronicle and grant either +5 wood, +5 stone, or +3 wood and +3 stone, strengthened to 40% in autumn.
- Merchant route rewards show a short world-space notification near the village when resources are gained.
- `Tracer une route forestière` appears only after `Réparer le vieux pont` is completed.
- It costs 30 wood and 20 stone, stores its status and days remaining in `RegionalProjects`, and completes 4 days after funding.
- Funding the forest road and completing it both add chronicle events.
- Once completed, the forest road makes active Foret production less wasteful: wood gain stays +1, but `forestCurrent` is consumed only about half the time.
- The daily `Travail de bûcheron` still consumes `forestCurrent` directly and is not affected by the forest road.
- `Étayer l’entrée de la mine` appears alongside the forest road after `Réparer le vieux pont` is completed.
- It costs 40 wood and 30 stone, stores its status and days remaining in `RegionalProjects`, and completes 4 days after funding.
- Funding the mine supports and completing them both add chronicle events.
- Once completed, the mine supports make the Mine the regional project path for raw yield: active Mine production stays at +1 stone with a 25% chance of +1 extra stone.
- The Mine still has no global stock, accident risk, miner mini-game, new location, NPC, market, or complex economy.
- These events do not create merchants, NPCs, markets, economy, or new locations.

## Architecture

- `src/scenes`: Phaser scenes and scene-level orchestration.
- `src/systems`: state, persistence, chronicle, and world logic.
- `src/ui`: HUD and UI display.
- `src/systems/RegionalProjects.ts`: saved regional project status and day-based milestone progression.
- `src/systems/DailyWork.ts`: saved once-per-day work availability for the woodcutter job.
- `GameState`: saved player resources, activity, forest stock, forest threshold flags, and daily action count.
- `src/systems/VillageRequests.ts`: saved active village request state, appearance chance, expiration, costs, and narrative outcomes.
- `src/systems/Seasons.ts`: day-derived season cycle, seasonal labels, mechanical modifiers, and transition chronicles.

## Current constraints

- No NPCs.
- No movement.
- No combat.
- No complex inventory.
- No skill tree.
- No market.
- No quest system.
- No complex economy.
- No external assets unless explicitly requested and tracked through `create-ai-asset.md`.
- No new locations without an explicit task.
- Keep the game canvas responsive to the browser viewport instead of presenting as a fixed-size page block.
