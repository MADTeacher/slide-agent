«Структура и принципы работы агентского harness для написания кода»

Целевая аудитория: software engineers, tech leads, engineering managers и AI-инженеры, которые хотят понять, как устроена обвязка вокруг LLM-агента, пишущего код.

Цель pdf презентации: объяснить, что coding agent — это не только LLM, а целая система управления: контекст, инструменты, sandbox, цикл планирования, выполнение команд, валидация, безопасность, память, telemetry и evals.

Сделай 12–15 слайдов. Стиль: современный, технический, чистый, без перегруженных карточек и dashboard-эстетики. Используй диаграммы, схемы потоков, архитектурные блоки, sequence diagram, lifecycle flow. На каждом слайде — один главный тезис.

Структура презентации:

1. Титульный слайд
   - Название: «Agentic Harness для написания кода»
   - Подзаголовок: «Как LLM превращается в управляемого coding agent»
   - Минималистичный визуал: агент, репозиторий, терминал, цикл обратной связи.

2. Проблема
   - LLM сама по себе не умеет надежно менять кодовую базу.
   - Ей нужны: контекст, инструменты, ограничения, проверка, память и контроль ошибок.
   - Покажи контраст: “chat completion” vs “agentic coding system”.

3. Что такое agentic harness
   - Определи harness как управляющую обвязку вокруг модели.
   - Он превращает модель в исполнителя задач: планирует, читает файлы, редактирует код, запускает тесты, анализирует ошибки.
   - Важно: модель — reasoning core, harness — execution/control layer.

4. Высокоуровневая архитектура
   Покажи схему с компонентами:
   - User request
   - Orchestrator / control loop
   - LLM / reasoning engine
   - Context manager
   - Repository indexer
   - Tool executor
   - Filesystem / patch manager
   - Shell / sandbox
   - Test runner
   - Memory / state
   - Policy & permissions
   - Telemetry / evals

5. Главный цикл работы агента
   Покажи loop:
   - Understand task
   - Build context
   - Plan
   - Act
   - Observe
   - Repair
   - Verify
   - Summarize / open PR
   Объясни, что надежность появляется из итеративного цикла, а не из одного ответа модели.

6. Контекст: как агент понимает кодовую базу
   Раскрой:
   - чтение файлов;
   - repo map;
   - semantic search;
   - dependency graph;
   - symbol index;
   - recent diffs;
   - issue/PR context;
   - user constraints.
   Главный тезис: качество контекста часто важнее размера модели.

7. Инструменты агента
   Покажи набор tool interfaces:
   - read file;
   - search;
   - edit file;
   - run shell command;
   - run tests;
   - inspect logs;
   - package manager;
   - linter/typechecker;
   - browser/API/docs lookup, если разрешено.
   Объясни, что инструменты должны быть явными, логируемыми и ограниченными.

8. Планирование и decomposition
   Объясни, как harness помогает разбивать задачу:
   - intent extraction;
   - constraints;
   - affected modules;
   - implementation plan;
   - risk analysis;
   - rollback strategy.
   Добавь пример: “Добавить OAuth login” → schema, backend route, frontend UI, tests, docs.

9. Редактирование кода
   Покажи flow:
   - выбрать файлы;
   - сгенерировать patch;
   - применить diff;
   - проверить конфликт;
   - перечитать измененные участки;
   - минимизировать scope изменений.
   Отдельно подчеркни принцип: агент должен вносить маленькие проверяемые изменения.

10. Sandbox и execution environment
   Объясни:
   - изоляция команд;
   - лимиты времени и ресурсов;
   - запрет опасных операций;
   - allowlist/denylist;
   - работа с секретами;
   - network policy.
   Главный тезис: coding agent должен быть мощным, но не безграничным.

11. Валидация результата
   Покажи воронку проверки:
   - форматирование;
   - lint;
   - typecheck;
   - unit tests;
   - integration tests;
   - regression tests;
   - manual reasoning review.
   Объясни, что harness должен не только писать код, но и доказывать, что изменение работает.

12. Ошибки и self-repair
   Раскрой типичный цикл:
   - test failure;
   - log analysis;
   - hypothesis;
   - targeted patch;
   - rerun tests.
   Покажи sequence diagram: agent → shell → error → model → patch → test pass.

13. Безопасность и governance
   Покрой:
   - permission gates;
   - human approval;
   - секреты и credentials;
   - destructive commands;
   - supply-chain risk;
   - audit log;
   - policy enforcement.
   Главный тезис: harness — это also safety boundary.

14. Telemetry, evals и качество
   Покажи метрики:
   - task success rate;
   - tests passed;
   - number of iterations;
   - patch size;
   - human intervention rate;
   - regression rate;
   - time-to-PR;
   - cost per task.
   Добавь мысль: без evals агентская система не улучшается управляемо.

15. Итоговый слайд
   Сформулируй 5 принципов хорошего coding harness:
   - explicit tools;
   - tight feedback loop;
   - scoped context;
   - safe execution;
   - measurable quality.
   Заверши фразой: «LLM генерирует гипотезы; harness превращает их в проверяемые изменения кода».

Дополнительные требования:
- Используй понятные технические диаграммы.
- Не перегружай слайды текстом.
- Вставь 1–2 небольших псевдокод-примера, например control loop агента.
- Объясняй термины: orchestrator, tool executor, context manager, sandbox, patch manager, evals.
- Не делай презентацию слишком маркетинговой; стиль должен быть инженерным и практическим.
- Избегай неподтвержденных утверждений о конкретных продуктах или компаниях.