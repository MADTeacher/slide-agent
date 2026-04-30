# Архитектурный и performance-аудит presentation generation

Дата аудита: 2026-04-30  
Репозиторий: `/Users/madteacher/Documents/GitHub/slidev-agent`  
Фокус: субагенты, оркестрация, делегирование, HTML-first pipeline, экспорт и QA.

## 1. Executive Summary

Текущая система медленная не из-за одного тяжелого скрипта, а из-за архитектурного решения сделать шесть субагентов обязательными для любого полного запроса на презентацию. Это прямо задано в `AGENTS.md`, `README.md`, `.agents/skills/presentation-design/SKILL.md`, `references/workflow.md` и `references/subagents.md`.

Основные причины задержки:

| # | Причина | Evidence | Impact | Confidence |
|---|---|---|---:|---:|
| 1 | Нет fast path: "сделай презентацию" всегда превращается в полный multi-agent процесс | `SKILL.md:19-32`, `workflow.md:155-171`, `AGENTS.md:20-29` | +30-50 мин | 0.95 |
| 2 | Критический путь почти полностью последовательный: после ранней пары researcher/asset все фазы ждут друг друга | `subagents.md:16-25` | +25-45 мин | 0.90 |
| 3 | Каждый субагент читает большой общий skill/reference corpus вместо минимального task packet | role configs + `wc -c`: до 439855 байт repeated reads, примерно 110k токенов | +10-25 мин | 0.85 |
| 4 | QA требует свежий полный PNG pass 1..N после каждой существенной правки | `slide-qa.md:20-28`, `workflow.md:107-115` | +5-20 мин на цикл | 0.90 |
| 5 | Экспортные скрипты сами последовательные: PNG/PDF по слайдам, PPTX запускает браузер на каждый слайд | `export_deck_png.mjs:66-78`, `export_deck_pdf.mjs:73-89`, `html2pptx.js:940-972` | +1-8 мин | 0.80 |

Прямой вывод: в текущем виде multi-agent архитектура для типовой генерации презентации замедляет процесс. Она полезна только для сложных случаев: фактическое исследование, брендовые материалы, protected visuals, несколько дизайн-направлений, независимый QA. Для понятного ТЗ она должна уступать прямому workflow с одним builder и deterministic export/QA.

Ожидаемый результат после Phase 1: типовая презентация внутри проекта должна идти за 7-10 минут вместо 60+ минут. Stretch goal после Phase 2: 5-7 минут за счет параллельного экспорта, browser reuse и cache.

## 2. Baseline vs Current Comparison

Telemetry реальных запусков в репозитории не найдена. Есть только пользовательский baseline: около 8 минут в изолированном harness. Current: наблюдение пользователя, больше часа. Ниже - reconstructed critical path из кода и конфигурации.

| Этап | Baseline time | Current time | Delta | Причина разницы | Можно убрать? | Можно ускорить? | Приоритет |
|---|---:|---:|---:|---|---|---|---|
| Router/brief | 0.5-1 мин | 2-5 мин | +1-4 | главный агент должен загрузить skill + workflow + планировать субагентов | частично | да | P1 |
| Research/outline | 1-2 мин | 5-12 мин | +4-10 | отдельный agent, читает skill/workflow/brand/content/deck-review | да для полного ТЗ | да | P1 |
| Asset planning | 0.5-2 мин | 5-15 мин | +4-13 | обязательный asset-builder даже при `visuals: []` | да для no-assets | да | P1 |
| Direction | 0-1 мин | 5-15 мин | +5-14 | обязательная 2-слайдовая direction-фаза | да при заданном стиле | да | P1 |
| HTML build | 3-5 мин | 10-25 мин | +7-20 | builder ждет upstream outputs и несет весь reference load | нет | да | P1 |
| QA PNG pass | 1-2 мин | 5-20 мин | +4-18 | отдельный QA agent + полный sequential pass + возможный repair loop | нет, но можно сделать deterministic | да | P1 |
| Export | 1-2 мин | 3-10 мин | +2-8 | exporter agent + sequential scripts + possible duplicated PNG | exporter-agent да | да | P2 |
| Coordination waits | около 0 | 10-30 мин | +10-30 | phase barriers and wait-for-all | да | да | P1 |

## 3. Execution Trace

| Шаг | Компонент | Вход | Выход | Время | Необходимость | Можно убрать? | Комментарий |
|---|---|---|---|---:|---|---|---|
| 1 | Main agent | user prompt | brief/slug/plan | unknown | да | нет | Нет telemetry; currently must plan orchestration |
| 2 | Main agent | skill | `workflow.md`, `subagents.md` | unknown | частично | да | Mandatory full process triggered by `SKILL.md:19` |
| 3 | Main/tool | slug | `presentations/<slug>` + scripts + manifest | sec-min | да | нет | Can be deterministic |
| 4 | Researcher | brief + refs | outline/facts | 5-12 мин est | нет для полного ТЗ | да | read-only; duplicates main briefing |
| 5 | Asset-builder | brief + refs | asset manifest/notes | 5-15 мин est | only when protected/brand assets | да | duplicates visual classification with researcher |
| 6 | Direction-designer | outline/assets | 2-slide direction | 5-15 мин est | only if style ambiguous/variants requested | да | builds temporary artifacts later reimplemented |
| 7 | HTML-builder | outline/assets/direction | full HTML deck | 10-25 мин est | да | нет | should be primary path |
| 8 | QA-reviewer | HTML deck | PNG + `slide-qa.md` | 5-20 мин est | да | agent can be replaced | Full pass repeats after fixes |
| 9 | Main | QA defects | repair task | 0.5-2 мин | if defects | no | Each loop restarts QA |
| 10 | HTML-builder | defects | patched HTML | 2-10 мин | if defects | no | serial repair loop |
| 11 | Exporter | clean QA proof | PDF/PNG/PPTX/SVG | 3-10 мин est | export yes, agent no | yes | Deterministic tool should do this |
| 12 | Main | artifacts | final answer | sec-min | да | нет | Should not re-analyze everything |

## 4. Critical Path

Current critical path:

```text
Main brief
  -> max(researcher, asset-builder)
  -> direction-designer
  -> html-builder
  -> qa-reviewer
  -> [html-builder repair -> qa-reviewer full pass] x 0..2
  -> exporter
  -> main final
```

Only `researcher` and `asset-builder` are allowed to overlap (`subagents.md:20`). Everything after asset gate is serialized. `max_threads = 6` in `.codex/config.toml:2` does not help much because the policy creates phase barriers.

## 5. Bottlenecks

| # | Bottleneck | Где находится | Evidence | Time impact | Root cause | Fix | Expected gain | Risk |
|---|---|---|---|---:|---|---|---:|---|
| 1 | Mandatory six-agent path | `SKILL.md`, `workflow.md`, `AGENTS.md` | `SKILL.md:19-32`, `workflow.md:159` | 30-50 мин | policy treats delegation as correctness gate | Add fast path; full path only by routing criteria | 30-45 мин | medium |
| 2 | Phase barriers | `subagents.md` | `subagents.md:16-25` | 15-30 мин | sequential dependency graph | allow speculative build and parallel export/preflight | 10-20 мин | medium |
| 3 | Repeated reference context | role configs | repeated reads approx 439855 bytes / 110k tokens | 10-25 мин | subagents load global skill corpus | role-specific briefs and cached reference summaries | 8-18 мин | low |
| 4 | No telemetry | repo-wide | no `telemetry`, `trace`, `metrics`, run logs except `.git/logs` | unknown | no measurement layer | add JSONL trace for phases/tools/context | diagnostic | low |
| 5 | Full PNG QA after every change | `slide-qa.md`, `workflow.md` | `slide-qa.md:20-28` | 5-20 мин/cycle | final QA protocol used as iterative dev loop | incremental QA + final full pass only once | 5-15 мин | medium |
| 6 | PPTX launches browser per slide | `html2pptx.js` | `html2pptx.js:940-972` inside loop from `export_deck_pptx.mjs:124-134` | 1-6 мин | no browser reuse | launch once per deck, reuse context/page | 1-5 мин | medium |
| 7 | PNG/PDF sequential render | export scripts | `export_deck_png.mjs:66-78`, `export_deck_pdf.mjs:73-89` | 1-5 мин | no concurrency, fixed waits | concurrency pool, font-ready waits | 1-4 мин | medium |
| 8 | Exporter as LLM agent | `.codex/agents/presentation-exporter.toml` | agent only runs deterministic commands | 2-6 мин | agent used where function is enough | replace with tool/workflow step | 2-5 мин | low |

## 6. Subagent Audit

| Subagent | Зачем запускается | Ценность | Дублирование | Отключить для типовой генерации? | Замена |
|---|---|---|---|---|---|
| `presentation-researcher` | outline/facts/slide plan | useful for fresh research or vague topic | overlaps main brief and builder outline | yes when prompt has content/structure | inline outline in builder or cached research |
| `presentation-asset-builder` | manifest, protected visuals, brand/content assets | high only for real assets | overlaps researcher visual classification | yes when `visuals=[]`, no brand, no protected assets | deterministic manifest scaffold + optional asset job |
| `presentation-direction-designer` | two-slide direction | useful for ambiguous style or variants | creates draft slides reworked by builder | yes when style is specified or speed requested | design tokens inside builder |
| `presentation-html-builder` | production HTML | essential | none if upstream compact | no | keep, but feed compact task packet |
| `presentation-qa-reviewer` | browser/PNG/visual QA | essential quality gate | LLM agent performs deterministic export/count | replace agent for normal path | deterministic QA + optional vision audit |
| `presentation-exporter` | final PDF/PNG/PPTX/SVG | export essential, agent not essential | can duplicate QA PNG | yes | deterministic export tool |

Verdict: subagents currently slow the system. They add value only under explicit complexity triggers. For normal "generate deck" they are coordination overhead.

## 7. Prompt Audit

Problematic instructions:

| Instruction | Issue | Evidence | Fix |
|---|---|---|---|
| "оркестрация обязательна" for new deck | removes economic decision | `SKILL.md:19`, `AGENTS.md:20` | make orchestration conditional |
| "главный агент обязан вызвать шесть" | forces all roles even when no value | `AGENTS.md:23-28` | route by task complexity |
| subagents "Используй SKILL.md" | subagents inherit global full-process policy | all `.codex/agents/*.toml` | create role-specific excerpts; forbid recursive orchestration |
| "если стиль не задан, предложи три направления" | simple prompt becomes design exploration | `workflow.md:196-208` | only on user request or high-stakes brand |
| "последовательный pass 1..N after changes" | iterative full QA loops | `slide-qa.md:20-28` | dirty-slide QA during iteration, final full pass once |
| "скорость не оправдывает пропуск..." | no performance budget | `SKILL.md:56` | keep quality gates but add fast path and budgets |

## 8. Presentation Pipeline Audit

Pipeline bottlenecks:

- `export_deck_png.mjs` runs asset gate every time, then renders slides one by one with a new page and fixed `300ms` wait.
- `export_deck_stage_png.mjs` uses one page but still screenshots slides sequentially with fixed wait.
- `export_deck_pdf.mjs` renders each slide to a separate PDF with `1200ms` fixed wait, then merges PDFs.
- `export_deck_stage_pdf.mjs` has fixed `2500ms + 800ms` waits.
- `export_deck_pptx.mjs` calls `html2pptx` per slide; `html2pptx` launches and closes Chromium for each slide.
- `presentation-export.ts` does not emit duration, command timings, slide counts by phase, or machine-readable status.

The tool path is not the main reason for 60+ minutes, but it compounds the agent overhead and becomes important after the fast path removes orchestration waste.

## 9. Fast Path Proposal

Fast path should be default for a typical request:

```text
classify -> create task packet -> deterministic scaffold -> one builder -> deterministic export/QA -> final
```

Enable fast path when:

- user asks for a new presentation with clear topic/slide count/format, or accepts reasonable assumptions;
- no explicit request for full multi-agent process;
- no protected/brand-critical asset dependency, or assets can be empty/placeholder-free;
- no request for 3 directions, deep research, current facts, or source-backed claims;
- target format is HTML/PDF/PNG, or PPTX-safe constraints are straightforward.

Do not launch:

- `presentation-researcher` unless current facts/research are needed;
- `presentation-asset-builder` unless protected/brand/product assets are present;
- `presentation-direction-designer` unless variants or ambiguous high-stakes style;
- `presentation-exporter` for deterministic exports.

Keep:

- `asset-manifest.json`;
- one fresh PNG export;
- one final `slide-qa.md`;
- asset gate before export;
- PPTX-safe preflight when PPTX requested.

Fallback to full mode when:

- user explicitly invokes full process or a subagent;
- brand/product/person/object visuals are critical and missing;
- task requires current external facts;
- first QA pass fails with systemic design defects;
- deck is large/high-stakes and user values quality over speed.

## 10. Target Architecture

Routing logic:

```text
if explicit_full_process or explicit_subagent:
  full_multi_agent()
else if is_typical_presentation(prompt) and complexity_score <= threshold:
  fast_presentation_path()
else if needs_research or protected_assets or brand_assets:
  selective_subagents()
else:
  direct_skill_path()
```

Target modes:

| Request type | Target path | Agents |
|---|---|---|
| ordinary request | direct answer/tool | 0 |
| typical presentation | fast path | 0-1, builder only if runtime requires |
| complex research deck | selective parallel | researcher + builder, maybe QA vision |
| brand/protected visuals | selective parallel | asset-builder + builder + deterministic QA |
| explicit variants | direction-designer optional | direction + builder |
| final export | deterministic tool | 0 |

## 11. Implementation Plan

### Phase 1 - 1-2 days

1. Change `AGENTS.md`, `SKILL.md`, `workflow.md`, `subagents.md`, `README.md`: full six-subagent orchestration is no longer default. It is selected only by routing criteria.
2. Add fast path rules with hard performance budget: target <= 8 minutes, max subagents for typical generation = 0 or 1.
3. Make `presentation-exporter` optional/replaced by deterministic export command for fast path.
4. Add compact task packet schema: brief, slide count, formats, constraints, assets, acceptance criteria. Pass that to builder instead of full conversation.
5. Add lightweight trace requirement: `exports/run-trace.jsonl` with phase start/end, actor, command, duration, input/output byte estimates.
6. Update both runtimes: `.codex/agents/*.toml`, `.opencode/agents/*.md`, `.opencode/tools/presentation-export.ts`.

### Phase 2 - architectural fixes

1. Add router/classifier and complexity score.
2. Add cached reference summaries keyed by file hash.
3. Add deterministic QA: count slides, export PNG, console errors, image load errors, DOM overflow checks, slide-qa skeleton.
4. Use dirty-slide QA during iteration and full `1..N` only for final pass.
5. Add export cache keyed by slide file hashes + manifest hash + script version + args.
6. Parallelize PNG/PDF export and reuse browser in PPTX export.

### Phase 3 - long-term

1. Replace agent orchestration with a workflow engine for deterministic phases.
2. Add dashboards for p50/p95 runtime by phase, LLM tokens, tool duration, cache hit rate.
3. Add deadline-based execution and cancellation for non-critical branches.
4. Add quality benchmark comparing fast path vs full path.

## 12. Acceptance Criteria

- Same prompt inside project completes in <= baseline, target <= 8 minutes.
- Stretch goal: <= 6 minutes for HTML+PNG+PDF without research/assets.
- Typical generation uses 0-1 subagents.
- Full multi-agent mode only when routing says it is economically justified.
- `exports/slide-qa.md` remains fresh and complete.
- LLM calls reduced by at least 60 percent for typical deck.
- Repeated reference context reduced by at least 70 percent.
- Telemetry records phase timings, tool timings, context sizes, outputs, retries and cache hits.

## 13. Concrete Code/Config Changes

| File | Current problem | Proposed change | Risk | Test |
|---|---|---|---|---|
| `AGENTS.md` | mandates all six workers | add fast-path route and selective orchestration | medium | prompt "10-slide HTML+PNG" uses fast path |
| `.agents/skills/presentation-design/SKILL.md` | full process mandatory for "сделай презентацию" | change to "full process when complex/explicit"; add router table | medium | skill smoke prompts |
| `references/workflow.md` | no performance budget; serialized full path | add fast path, complexity triggers, budgets | medium | benchmark suite |
| `references/subagents.md` | fixed phase order | add optional roles, parallel/early-exit rules | medium | selective-subagent tests |
| `.codex/agents/*.toml` | subagents read global skill and broad refs | role-scoped reference packets; no recursive orchestration | low | context byte check |
| `.opencode/agents/*.md` | same plus command limits | sync role-scoped packets and budgets | low | OpenCode smoke |
| `.opencode/tools/presentation-export.ts` | no timing; errors returned as strings | record duration/status; structured failure | low | failing export test |
| `export_deck_png.mjs` | sequential pages and fixed wait | add `--concurrency`, page pool, font-ready wait | medium | compare PNG hashes/count |
| `export_deck_pdf.mjs` | sequential per-slide PDF + fixed wait | parallel render or combined print path | medium | page count/visual diff |
| `html2pptx.js` | launches Chromium per slide | browser/context reuse from exporter | medium | PPTX editability tests |

Pseudo-diff for router policy:

```text
- full process always uses six subagents
+ default path:
+   if typical_presentation && !complex_assets && !explicit_full:
+      run fast_presentation_path
+   else:
+      run selective_subagents based on needed phases
+ full six-agent process only for explicit_full or high_complexity
```

Pseudo trace event:

```json
{"run_id":"...","phase":"qa_png_export","actor":"tool","event":"end","duration_ms":42133,"input_bytes":15342,"output_bytes":812,"status":"ok","artifacts":["exports/png","exports/slide-qa.md"]}
```

## 14. Test Plan

| Test | Prompt | Expected | Metrics | Pass threshold |
|---|---|---|---|---|
| baseline direct skill | known 8-min prompt in isolated harness | finished deck | wall-clock, quality score | <= 8 min |
| current multi-agent | same prompt in current repo | trace shows six-agent path | phase durations, LLM calls | diagnostic only |
| optimized fast path | same prompt after Phase 1 | finished deck | wall-clock, subagent count, tool time | <= 8 min, subagents <= 1 |
| complex research | "investor deck with current market facts and sources" | selective researcher | quality + citations + time | subagents justified |
| protected assets | ESL clothing/person images | asset-builder only if needed | asset gate status, blocked assets | no fake sources |
| quality regression | 12-slide deck visual rubric | clean PNG pass | defects per slide | no degradation vs full path |
| large input stress | 30 slides with dense data | no context explosion | p95 LLM/tool time | completes under budget |

## Management Conclusion

The same prompt takes 60+ minutes instead of about 8 because the project policy turns a presentation request into a mandatory editorial production line: six agents, repeated large context loads, serialized phase barriers, full QA loops and an LLM agent even for deterministic export. This is not an implementation detail; it is the architecture.

Immediate changes:

1. Make fast path the default for typical deck generation.
2. Disable `researcher`, `asset-builder`, `direction-designer` and `exporter` unless routing criteria require them.
3. Keep one production builder and deterministic export/QA.
4. Add telemetry before further tuning.
5. Optimize exporters after orchestration overhead is removed.

Final verdict: do not use the current full multi-agent system for ordinary presentation generation. Use it selectively, when the extra agents have measurable value greater than their coordination cost.
