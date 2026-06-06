Fix cross-page data consistency on Statistiques. The summary tiles are generated
independently from the dashboard and from their own charts, so numbers disagree
(Statistiques shows 36/58 = 62% mission success; dashboard shows different totals
for the same robot; lifetime truth is 562/969 = 58%).

- There must be ONE seeded source per robot for rounds/incidents/docking/distance.
  Both the dashboard and Statistiques read from it, filtered by the selected period.
  Same robot + same period => identical numbers on both pages.
- Each Statistiques summary tile must equal the sum/derivation of the chart it sits
  above: "Arrêts d'urgence" tile === sum of the Arrêts d'urgence bars; mission
  success tile === terminées/total from the réussite stacked bars; amarrage tile
  === docking series; distance tile === sum of distance bars.
- Keep lifetime anchors realistic (full history ≈ 562 terminées / 969 total ≈ 58%);
  period figures scale from the same generator.

Also: verify the Arrêts d'urgence bars are legible in LIGHT mode (red can wash
out), and add a hover tooltip to the "Activité par heure" heatmap showing
jour + heure + nombre de rondes.

Comment where the single per-robot data source lives so both pages share it.