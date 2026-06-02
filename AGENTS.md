# Agent rules

This file contains the working rules for AI agents editing this repository. It must be read at the start of every user request.

## Mandatory workflow

- At the start of every user request, read `project.config.md` before making code or architecture decisions.
- At the start of every user request, read `changelog.md` to understand recent changes.
- At the end of every development task, update `changelog.md`.
- If a task changes the project direction, scope, architecture, stack, constraints, or current prototype outline, update `project.config.md`.
- Keep changes focused on the user's request.
- Prefer simple, readable, extensible code over premature systems.
- Run `npm run build` after TypeScript or gameplay code changes.

## Encoding rules

- Treat repository text files as UTF-8.
- On Windows, when reading files with accented text, prefer explicit UTF-8 reads if terminal output looks garbled.
- When using `apply_patch`, prefer ASCII-only context anchors around accented French text so patch matching does not depend on terminal-rendered accents.
- Do not rewrite accented project text just to avoid encoding issues; preserve the existing content unless the task asks for text changes.

## Code rules

- Stack: Phaser 4, TypeScript, Vite.
- Keep the expected structure: `src/scenes`, `src/systems`, `src/ui`.
- Use `src/scenes` for Phaser scenes.
- Use `src/systems` for game state, timers, persistence, and world logic.
- Use `src/ui` for HUD and interface rendering.
- Use `localStorage` only for simple prototype persistence.
- Do not add external assets unless explicitly requested.
- Do not add movement, NPCs, combat, complex inventory, skill trees, markets, quests, or complex economy unless explicitly requested.
- Do not add new locations unless explicitly requested.
- Do not add gameplay impact to narrative events unless explicitly requested.
- Do not create a new system when an existing system can be extended cleanly.

## Project files to maintain

- `AGENTS.md`: agent workflow and coding rules.
- `project.config.md`: general project outline and current prototype scope.
- `changelog.md`: short history of completed development changes.
