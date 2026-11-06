# Завдання

Джерела: `spec.md`, `plan.md`. `[P]` — незалежні задачі з узгодженим розподілом файлів.
`[x]` — Done перевірено, доказ записано; блокування не позначається як завершення.
Докази: `evidence/test-run.txt` (повний прогін 2026-11-06), `evidence/lighthouse.json`, `evidence/T022-readme-check.txt`.

## Стан продовження

- Оновлено: 2026-11-06
- Поточна хвиля: W6 завершено; W7 — T025–T027
- Наступний крок: T025 (людина редагує урок за README) — локально; T026/T027 — після D2/D3
- Blockers / відкриті рішення: D1 вирішено 2026-11-06 — GitHub Pages («ok GitHub Pages»); push і створення репозиторію — окремий дозвіл; D2 (токен і хостинг бота) → T026; D3 (Umami) → T027
- Погоджений обсяг: `plan.md` → «Погоджений обсяг і зміни»

## W1 — Фундамент

- [x] T001 Git і базова структура — `.gitignore`
  - Вимоги: NN-03; TASK «коміт після кроку»
  - Done / перевірка: `git check-ignore .env` → `.env`
  - Доказ і стан: 2026-11-06, коміт `517b911`; `.env`, `node_modules`, `dist`, `.venv`, `*.sqlite` ігноруються
- [x] T002 Каркас Astro — `web/package.json`, `web/astro.config.mjs`, `web/tsconfig.json`, `web/vitest.config.ts`, `web/playwright.config.ts`
  - Вимоги: plan «Підхід»
  - Done / перевірка: `npm run build` → 17 сторінок, код 0
  - Доказ і стан: 2026-11-06; Astro 7.4.7 (не 5 — див. plan, рішення «Astro 7.4»)
- [x] T003 Схема контенту з людськими помилками — `web/src/lib/content.ts` (замість `content.config.ts`, див. plan)
  - Вимоги: FR-18
  - Done / перевірка: файл без `tldr` → збірка падає з назвою файлу й поля
  - Доказ і стан: `evidence/T022-readme-check.txt` («поле «tldr»: потрібен текст»); unit `content.test.ts` (3 сценарії помилок). Під час розробки валідатор сам знайшов незакавичену двокрапку в уроці 7
- [x] T004 Логіка гри + unit-тести — `web/src/lib/game.ts`, `web/tests/unit/game.test.ts`
  - Вимоги: FR-05–FR-09, FR-14, SC-05, NN-02
  - Done / перевірка: `npm test` зелений; повторна відповідь без XP, заморозка, пропуск 5 і 30 днів, дата назад, максимум 1020 XP
  - Доказ і стан: `evidence/test-run.txt` — 32/32 Vitest
- [x] T005 Сховище й аналітика — `web/src/lib/storage.ts`, `web/src/lib/analytics.ts`
  - Вимоги: FR-10, FR-17
  - Done / перевірка: unit зі «зламаним» localStorage; без env немає скрипта Umami
  - Доказ і стан: `storage.test.ts` (3) + e2e «без налаштування аналітики немає скрипта Umami», «сховище недоступне»

## W2 — P1: урок 1 і карта

- [x] T006 Контент 8 уроків з виправленими фактами — `content/lessons/01…08-*.md`, `content/challenge.yaml`, `content/doors.yaml`
  - Вимоги: FR-04, FR-19, SC-03, SC-09, NN-01
  - Done / перевірка: збірка проходить; `check:content` — ≤ 450 слів, 0 заборонених слів, позначки beta
  - Доказ і стан: 157–311 слів на урок; 24 питання з поясненнями; хаос сумується в 214 (unit)
- [x] T007 Макет, шапка прогресу, режим фокусу — `web/src/layouts/Base.astro`, `web/src/styles/global.css`, `web/src/scripts/{shell,store}.ts`
  - Вимоги: FR-07, FR-09, FR-11, NN-05
  - Done / перевірка: e2e «режим фокусу ховає шапку й пам'ятається»
  - Доказ і стан: `evidence/test-run.txt`; шапку ущільнено після огляду скриншотів 360 px (було 4 рядки, стало 2)
- [x] T008 Сторінка уроку — `web/src/pages/lesson/[id].astro`, `web/src/scripts/lesson.ts`, `web/src/scripts/copy.ts`, `web/src/components/DoorsMap.astro`
  - Вимоги: FR-04–FR-06, FR-19, FR-20, SC-01, SC-03, NN-04
  - Done / перевірка: e2e урок 1 до нагороди; без JS видно всі картки
  - Доказ і стан: урок 1 — ≤ 25 натискань, пояснення видно після кожної відповіді; схему уроку 1 виправлено після огляду (відступи `figure`, перенос посеред слова)
- [x] T009 Лендінг і вибір ролі — `web/src/pages/index.astro`, `web/src/pages/start.astro`
  - Вимоги: FR-01, FR-02, SC-02
  - Доказ і стан: e2e — 1 натискання до першої картки; `/start` → урок 1
- [x] T010 Карта місій — `web/src/pages/map.astro`
  - Вимоги: FR-03
  - Доказ і стан: e2e «Розробник» → 3 і 6 рекомендовані, урок 6 відкривається напряму

## W3 — P2

- [x] T011 Сторінка прогресу — `web/src/pages/progress.astro`
  - Вимоги: FR-07, FR-08, FR-21
  - Доказ і стан: e2e «скидання прогресу вимагає підтвердження» (без `confirm()`)
- [x] T012 [P] Бібліотека промптів — `web/src/pages/prompts.astro`
  - Вимоги: FR-12
  - Доказ і стан: e2e «бібліотека промптів: 8 груп, фільтр, копіювання»
- [x] T013 [P] Шпаргалка «Які двері» — `web/src/pages/doors.astro`, `web/src/components/DoorsFilter.astro`, `web/src/scripts/doors.ts`
  - Вимоги: FR-13
  - Доказ і стан: e2e «таблиц» → 1 рядок (Excel); «ракета» → підказка
- [x] T014 Челендж 7 днів — `web/src/pages/challenge.astro`
  - Вимоги: FR-14
  - Доказ і стан: e2e день 5 → +20 XP один раз
- [x] T015 Нагадування календарем — `web/src/lib/ics.ts`, `web/src/pages/reminders.astro`, `web/tests/unit/ics.test.ts`
  - Вимоги: FR-15
  - Доказ і стан: unit (5) + e2e завантаження: 7 `VEVENT`, `DTSTART …T083000`. Імпорт у реальний календар не перевірявся
- [x] T016 `course.json` для бота — `web/src/pages/course.json.ts`
  - Вимоги: FR-16 (контракт)
  - Доказ і стан: `load_course('../web/dist/course.json')` бота → 8 уроків, 7 днів; `next_lesson([1,2])` → 3

## W4 — Telegram-бот

- [x] T017 Бот — `bot/`
  - Вимоги: FR-16, NN-02, NN-03
  - Done / перевірка: `pytest` зелений; імпорт без токена
  - Доказ і стан: 44/44 pytest (`evidence/test-run.txt`); живий запуск — заблоковано D2. Відхилення субагента прийнято: пауза після 3 повних днів, «День N» — порядковий номер повідомлення, після 8 уроків — 7 днів челенджу, `/start` без часу за замовчуванням (згода)

## W5 — Якість

- [x] T018 E2E Playwright — `web/tests/e2e/*.spec.ts`
  - Вимоги: SC-01, SC-02, SC-04, SC-05, FR-03, FR-11, FR-20
  - Доказ і стан: 15/15 на 360 px у Chrome
- [x] T019 Lighthouse мобільний — `web/scripts/lighthouse.mjs`
  - Вимоги: SC-06
  - Доказ і стан: `evidence/lighthouse.json` — `/`: Perf 100, A11y 100; `/lesson/1/`: 100/100; `/map/`: 98/100
- [x] T020 Перевірка контенту — `web/scripts/check-content.mjs`
  - Вимоги: SC-01, SC-05, SC-09
  - Доказ і стан: 0 помилок; перша версія правила Outlook давала хибну тривогу на промпт уроку 8 — звужено до уроку 4
- [x] T021 `NEEDS_REVIEW.md`
  - Вимоги: SC-09, NN-01
  - Доказ і стан: 10 пунктів (R1–R10) з джерелами й датою

## W6 — Передача

- [x] T022 README — `README.md`
  - Вимоги: SC-07
  - Доказ і стан: `evidence/T022-readme-check.txt` — зміна в уроці 2 з'явилась у `dist`, 0 змін у `web/src`; `.env` підхоплюється (виправлено: конфіг не читав `.env`); підшлях `BASE_PATH` перевірено. Перевірка на людині ≤ 10 хв — після MVP
- [x] T023 Узгодження — `alignment.md`
  - Доказ і стан: 2026-11-06
- [x] T024 Деплой прев'ю на GitHub Pages — `.github/workflows/pages.yml`
  - Рішення D1: GitHub Pages, власник 2026-11-06 «ok GitHub Pages»; акаунт `StsZu` (gh CLI)
  - Done / перевірка: відкривається `https://stszu.github.io/claude-bez-nudhy/`, урок 1 з карти, `course.json` з повними адресами
  - Стан: workflow готовий (тести + check:content + збірка з `SITE_URL`/`BASE_PATH` з `configure-pages`); локальна збірка з `BASE_PATH=/claude-bez-nudhy/` — 17 сторінок, 25 кореневих посилань, усі з підшляхом; `course.json` site = `https://stszu.github.io`. Push дозволено 2026-11-06 («ok push»): репозиторій https://github.com/StsZu/claude-bez-nudhy створено (публічний), Pages — `build_type: workflow`
  - Спроби: 1) запуск 42250363283 — build успішний, deploy: 10 хв `updating_pages` → тайм-аут (перший деплой нового сайту); 2) повтор deploy того самого коміту → «Deployment cancelled» за 5 с (той самий `pages_build_version`, що й скасований); 3) новий коміт — 400 «in progress deployment», стару публікацію скасовано через API; 4) повтор → success
  - Доказ: `evidence/T024-deploy.txt` — https://stszu.github.io/claude-bez-nudhy/: `/`, `/lesson/1/`, `/map/`, `/course.json` → 200; усі ресурси уроку 1 → 200

## W7 — Прогалини з узгодження (2026-11-06)

- [ ] T025 Тест редагування на людині — per SC-07 (partial)
  - Залежності: немає (локально)
  - Done / перевірка: нетехнічна людина змінює текст уроку за README ≤ 10 хв; час і труднощі записано в `evidence/T025.md`
- [ ] T026 Живий запуск бота — per FR-16 (partial); заблоковано D2
  - Done / перевірка: `/start` → вибір часу → повідомлення о вибраній хвилині; квіз з поясненням; `/stop`, `/forget`
- [ ] T027 Живий збір аналітики — per FR-17 (partial); заблоковано D3
  - Done / перевірка: події `lesson_start`…`reminder_set` видно в Umami; воронка урок 1 → урок 8

## Покриття

| Вимога | Задачі | Перевірка / доказ |
|---|---|---|
| FR-01, FR-02, SC-02 | T009, T018 | e2e лендінг, `/start` |
| FR-03 | T010, T018 | e2e карта |
| FR-04, FR-05, FR-06, SC-03, NN-04 | T006, T008, T018 | e2e урок 1, повторна відповідь |
| FR-07, FR-08, FR-09, SC-05, NN-02 | T004, T007, T011, T018 | unit + e2e пропуску 5 днів |
| FR-10, SC-04 | T005, T018 | unit + e2e перезавантаження, недоступне сховище |
| FR-11 | T007, T018 | e2e фокус |
| FR-12 | T012, T018 | e2e бібліотека |
| FR-13 | T013, T018 | e2e фільтр |
| FR-14 | T004, T014, T018 | unit + e2e |
| FR-15 | T015 | unit + e2e завантаження |
| FR-16 | T016, T017 | pytest + інтеграція з `dist/course.json` |
| FR-17 | T005 | unit + e2e (немає скрипта); живі події — D3 |
| FR-18, SC-07 | T003, T022 | збірка зі зламаним файлом; README |
| FR-19 | T006, T008 | огляд скриншотів уроку 1 |
| FR-20, NN-05 | T008, T018, T019 | e2e без JS + Lighthouse A11y 100 |
| FR-21 | T011, T018 | e2e скидання |
| SC-01 | T006, T018, T020 | ≤ 311 слів + ≤ 25 натискань |
| SC-06 | T019 | Lighthouse |
| SC-08 | — | після запуску (поза приймання MVP) |
| SC-09, NN-01 | T006, T020, T021 | check:content + NEEDS_REVIEW |
| NN-03 | T001, T017 | `.gitignore`, `.env.example` без значень |

Прогалини з узгодження й баги — нова хвиля з новими ID, у задачі джерело й тип
розриву (`per FR-03 (partial)`); завершені задачі та їхні
ID не переписувати. На новій сесії прочитати цей стан, релевантні документи й
фактичні файли та продовжити з «Наступного кроку».
