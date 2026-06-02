# Create AI Asset

## Purpose

This document tracks AI-generated visual assets for Petit Monde Vivant.

The goal is to move from placeholder Phaser shapes toward a coherent visual identity, one asset at a time. Each generated asset should be reviewed, criticized, and used to improve the next prompt.

## Asset Direction

- Medieval rural world, quiet and readable.
- Warm hand-painted or illustrated feeling.
- Simple silhouettes that remain clear at game scale.
- No modern objects, no UI emoji, no photorealistic look.
- Assets should support the existing places first: Foret, Mine, Village, and the old bridge project.
- The first priority is a coherent world map asset, not isolated icons.
- The HUD should feel like an overlay above the map, not like separate panels that consume the world.
- The map can be larger than the viewport and support scrolling/panning so important areas are not hidden behind fixed UI.
- Generated assets should not add new gameplay, NPCs, markets, locations, or systems by themselves.
- State variants of an existing asset must preserve visual continuity with the source asset: same camera angle, same orientation, same footprint, same path/river/road direction, same approximate scale, and same in-game anchor point.
- When generating a repaired, exhausted, upgraded, damaged, seasonal, or alternate-state version, use the current integrated asset as a reference image whenever possible. If reference-image generation is not possible, the prompt must explicitly describe the original orientation and what must remain unchanged.

## Workflow

1. Choose one concrete asset to generate.
2. Write the intended in-game use and target size.
3. If this is a state variant, identify the source asset that must stay visually consistent.
4. Generate one or more AI variants.
5. Review what works and what fails.
6. Keep the best lessons in this document.
7. Integrate only assets that fit the current prototype and constraints.

## Prompt Template

```text
Create a [asset type] for a small medieval village management game.
Style: warm hand-painted 2D illustration, readable silhouette, soft natural colors, no text, no UI, no characters unless explicitly requested.
Subject: [specific subject].
Use: [world map / HUD icon / project panel / background detail].
Format: [transparent background / square icon / wide scene / tile-like asset].
Constraints: must remain readable at [target size], avoid photorealism, avoid modern objects.
For state variants: preserve the source asset's camera angle, orientation, footprint, path direction, scale, and anchor point; change only the requested state.
```

## Review Template

```text
Asset:
Date:
Intended use:
Prompt:
Result:
Works well:
Does not work:
Next prompt adjustment:
Decision: reject / keep for iteration / integrate
```

## Asset Log

| Asset | Intended use | Status | What works | What to improve |
| --- | --- | --- | --- | --- |
| Scrollable world map | Main play surface behind HUD overlays | Planned first | Should immediately replace the prototype-shape feeling | Need room for Foret, Mine, Village, old bridge, paths, and safe HUD overlay zones |
| Old bridge | Regional project visual / world detail | Damaged and repaired integrated | Makes the bridge project visible on the world map and gives a clear before/after state | Needs in-game scale review near Village and HUD overlays |
| Forest landmark | World map location | Healthy and exhausted integrated | Organic tree cluster reads better than triangle placeholders; exhausted state now has a distinct visual | Need review at in-game scale and possible scale cleanup |
| Forest ground patch | World map blend detail | Integrated | Helps the painted forest sit more naturally on the coded meadow | Needs review in-game; edge fringe may still need prompt/cleanup adjustment |
| Mine landmark | World map location | Integrated | Replaces the abstract mine marker with a clear painted entrance | Needs in-game scale review against the forest and meadow |
| Village landmark | World map location | Integrated | Gives the settlement warmth and identity without adding NPCs | Rich detail may need simplification if it reads too dense at game scale |

## Lessons Learned

- 2026-06-02 healthy forest integration: the magenta-key preview was converted to `public/assets/forest-healthy.png` with transparency and integrated as the Foret world-map landmark. It still needs visual review at in-game scale before generating the exhausted variant.
- 2026-06-02 village integration: the Village landmark was generated and converted from magenta key to `public/assets/village-landmark.png`; future village prompts should ask for fewer tiny details if the asset reads too busy at 140-190 px.
- 2026-06-02 old bridge integration: damaged and repaired bridge landmarks were generated and converted from magenta key to `public/assets/old-bridge-damaged.png` and `public/assets/old-bridge-repaired.png`; the repaired version is visually cleaner, while the damaged version communicates the project need clearly. The repaired version was generated without using the damaged bridge as a reference, so its path direction is not perfectly coherent; future repaired/damaged state variants should use the previous state image as a reference or explicitly lock orientation and path direction in the prompt.
- 2026-06-02 exhausted forest integration: the exhausted forest variant was generated and converted from magenta key to `public/assets/forest-exhausted.png`; it includes its own broad dry ground base, so it may need scale review against the healthy forest and forest ground patch. It was generated without using the healthy forest as a reference; future exhausted/healthy variants should preserve the same landmark footprint and camera orientation.
- 2026-06-02 forest ground patch: a strong landmark can look too polished against coded terrain, so future landmarks should include a subtle painted ground blend patch or the whole map background should be upgraded toward the same style.
- 2026-06-02 mine integration: the Mine landmark works best as a compact painted entrance, and all painted landmarks need restrained display sizes so the map reads more zoomed out and less sticker-like.
- Start with the full world map before small HUD icons or isolated landmarks.
- Design the HUD as overlay elements that can sit above the map without creating permanent blind spots.
- Leave calmer low-detail areas in the map where HUD overlays can rest.
- Prefer assets with transparent backgrounds for map landmarks.
- Prefer reference-based generation for any asset that represents another state of something already integrated.
- Avoid details that only read at full size but disappear in the 1280x720 layout.
- Keep prompts strict about no text inside the image; game labels remain rendered by Phaser.

## Reviews

```text
Asset: Forest landmark healthy
Date: 2026-06-02
Intended use: World map location landmark for Foret.
Prompt: Healthy forest landmark for a small medieval village management game, warm hand-painted 2D illustration, slightly top-down / gentle 3-4 view, centered isolated asset on flat #ff00ff chroma-key background, readable at about 160-220 px, no text, no UI, no characters, no modern objects, no photorealism.
Result: Generated preview, converted from magenta key to transparent PNG, integrated in GameScene as public/assets/forest-healthy.png.
Works well: Compact mixed tree cluster, warm countryside mood, clear forest silhouette, likely stronger than current placeholder shapes.
Does not work: Needs visual review at in-game scale; small foliage details may compress poorly.
Next prompt adjustment: If too detailed at scale, request fewer larger foliage masses and a simpler outline.
Decision: integrate
```

```text
Asset: Mine entrance landmark
Date: 2026-06-02
Intended use: World map location landmark for Mine.
Prompt: Medieval mine entrance landmark for a small village management game, warm hand-painted 2D illustration, slightly top-down / gentle 3-4 view, compact rocky hillside with a dark tunnel opening and simple wooden support beams, readable at 130-180 px, no carts, no tools, no characters, no modern objects, no text, no UI, generated on flat #ff00ff chroma-key background.
Result: Generated preview, converted from magenta key to transparent PNG, integrated in GameScene as public/assets/mine-entrance.png.
Works well: Clear tunnel entrance, warm rocks and wood, readable mine silhouette, fits the forest style better than the abstract marker.
Does not work: Needs in-game scale review; may still look more polished than the coded meadow until more terrain blending exists.
Next prompt adjustment: If too polished, request fewer rock details, softer contrast, and a smaller painted ground base.
Decision: integrate
```

```text
Asset: Forest ground patch
Date: 2026-06-02
Intended use: Soft terrain blend under the healthy Foret landmark.
Prompt: Painted oval meadow ground patch for a small medieval village management game, warm hand-painted 2D illustration, slightly top-down, muted meadow greens, soft natural edge, no objects, no text, no UI, no characters, no modern objects, generated on flat #ff00ff chroma-key background.
Result: Generated preview, converted from magenta key to transparent PNG, integrated in GameScene as public/assets/forest-ground-patch.png.
Works well: Gives the forest a local painted base and reduces the pasted-on feeling against the simple coded meadow.
Does not work: The original cutout had a small magenta edge fringe; cleanup reduced it but the edge still needs in-game review.
Next prompt adjustment: Ask for a softer, less jagged edge with broader brush masses and no thin grass blades along the cutout boundary.
Decision: integrate
```

```text
Asset: Village landmark
Date: 2026-06-02
Intended use: World map location landmark for Village.
Prompt: Compact medieval village landmark for a small village management game, warm hand-painted 2D illustration, slightly top-down / gentle 3-4 view, a small cluster of 3 to 5 thatched rural houses, tiny central dirt path, gentle chimney smoke, readable at 140-190 px, no text, no UI, no characters, no animals, no modern objects, generated on flat #ff00ff chroma-key background.
Result: Generated preview, converted from magenta key to transparent PNG, integrated in GameScene as public/assets/village-landmark.png.
Works well: Warm settlement identity, clear thatched rooftops, no NPCs, stronger than the circular placeholder marker.
Does not work: Rich house details and smoke may compress or look dense at in-game scale.
Next prompt adjustment: If too busy, ask for 2 or 3 larger houses, lower chimney smoke, and a simpler ground footprint.
Decision: integrate
```

```text
Asset: Old bridge damaged
Date: 2026-06-02
Intended use: World map project landmark for the old bridge before completion.
Prompt: Old damaged medieval wooden bridge for a small village management game, warm hand-painted 2D illustration, slightly top-down / gentle 3-4 view, broken planks, missing rail pieces, fragile rural structure over a narrow ravine or stream bed, readable at 120-170 px, no text, no UI, no characters, no animals, no modern objects, generated on flat #ff00ff chroma-key background.
Result: Generated preview, converted from magenta key to transparent PNG, integrated in GameScene as public/assets/old-bridge-damaged.png.
Works well: The broken planks communicate the repair project immediately, and the rocky base gives a concrete world detail.
Does not work: The base is broad for a small map detail and may need a smaller display width if it competes with the places.
Next prompt adjustment: If too large visually, ask for a tighter bridge silhouette with less terrain base.
Decision: integrate
```

```text
Asset: Old bridge repaired
Date: 2026-06-02
Intended use: World map project landmark after the old bridge project is completed.
Prompt: Repaired old medieval wooden bridge for a small village management game, warm hand-painted 2D illustration, slightly top-down / gentle 3-4 view, sturdy repaired planks, simple rails, neat posts, rustic and modest, readable at 120-170 px, no text, no UI, no characters, no animals, no modern objects, generated on flat #ff00ff chroma-key background.
Result: Generated preview, converted from magenta key to transparent PNG, integrated in GameScene as public/assets/old-bridge-repaired.png.
Works well: Clear repaired state, readable wooden structure, strong before/after contrast with the damaged bridge.
Does not work: It is cleaner and more polished than the damaged version, so it needs scale review to make the state change feel natural.
Next prompt adjustment: If too polished, request a repaired but still weathered bridge with fewer metal details.
Decision: integrate
```

```text
Asset: Forest landmark exhausted
Date: 2026-06-02
Intended use: World map location landmark for Foret when forestCurrent reaches 0.
Prompt: Exhausted forest landmark for a small village management game, warm hand-painted 2D illustration, slightly top-down / gentle 3-4 view, mostly cut stumps, a few thin bare trunks, sparse dry undergrowth, muted brown-green ground, readable at about 160-220 px, no text, no UI, no characters, no animals, no modern objects, no tools, no fire, generated on flat #ff00ff chroma-key background.
Result: Generated preview, converted from magenta key to transparent PNG, integrated in GameScene as public/assets/forest-exhausted.png.
Works well: The depleted state is immediately readable and more diegetic than a warning slash.
Does not work: The broad dry base may overlap with the existing forest ground patch styling, and the taller trunks may affect label spacing.
Next prompt adjustment: If it feels too large, request a tighter stump cluster with fewer tall bare trunks and a softer edge.
Decision: integrate
```
