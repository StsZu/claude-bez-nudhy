# Потребує перевірки

Факти, яких немає в курсі або які подано з обережним формулюванням. Перевірено 2026-11-06. Перед запуском для команди пройти список ще раз.

| # | Що | Де в курсі | Стан на 2026-11-06 | Джерело | Що зробити |
|---|---|---|---|---|---|
| R1 | Max — верхня межа ціни ($200 у тексті курсу) | Урок 7: «від $100/міс» | На claude.com/pricing у таблиці лише $100; $200 не підтверджено | [claude.com/pricing](https://claude.com/pricing) | Звірити рівні Max; за потреби повернути «$100–200» |
| R2 | Голос у CarPlay | Прибрано з уроку 2 | Офіційного джерела не знайдено | — | Знайти сторінку підтримки Anthropic; якщо є — додати в урок 2 |
| R3 | Outlook вийшов із beta? | Урок 4: «Outlook (beta)» | Public beta з 2026-05-07; виходу з beta не знайдено | [Claude for Microsoft 365](https://claude.com/claude-for-microsoft-365), [blog](https://claude.com/blog/collaborate-with-claude-across-excel-powerpoint-word-and-outlook) | Якщо вийшов — прибрати «(beta)» в уроці 4 і `content/doors.yaml` |
| R4 | Claude for Google Workspace | Урок 4: «Google Docs, Sheets і Slides (beta)» | Public beta з 2026-10-06, платні плани | [claude.com/blog](https://claude.com/blog/claude-now-works-in-google-docs-sheets-and-slides) | Стежити за виходом з beta |
| R5 | Claude Tag у Slack — які плани | Урок 4: «плани Team і Enterprise» | Pricing: Team і Enterprise — так; Free, Pro, Max — ні | [claude.com/pricing](https://claude.com/pricing) | Перевірити, чи є в плані вашої команди |
| R6 | Claude Science — доступ | Урок 7: «обмежений доступ» | Запуск 2026-06-30; джерела розходяться (beta для платних vs лише перевірені організації) | вторинні огляди; офіційного оголошення не відкрито | Звірити з anthropic.com |
| R7 | Claude Security — доступ | Урок 7: «(beta)» | Public beta з кінця квітня 2026; Enterprise, «скоро» Team і Max | [anthropic.com/product/security](https://www.anthropic.com/product/security) | Уточнити плани |
| R8 | Enterprise — умови | Урок 7: «від 20 місць» | Pricing: від 20 місць, річна оплата + використання за тарифами API | [claude.com/pricing](https://claude.com/pricing) | Перевірити перед запуском |
| R9 | Схема «5 груп продуктів» з уроку 1 | Урок 1: схема дверей — реконструкція | Оригінальна картинка в документі курсу порожня | `course/course.md`, рядок з `embedded content` | Якщо оригінал знайдеться — звірити групи |
| R10 | Ліміти Umami Cloud Hobby (≈100K подій/міс) | Лише `plan.md` (не в курсі) | Огляди розходяться; офіційна сторінка лімітів не показала | [umami.is/docs/cloud/faq](https://umami.is/docs/cloud/faq) | Перевірити перед створенням акаунта (рішення D3) |

Виправлено в курсі за аудитом (не потребує перевірки): Team «від 5 людей» → «від 2 людей»; позначки beta для Linux, Google Workspace, Claude Security; «Claude Tag — Team і Enterprise»; задачі за розкладом — платні плани. Деталі: `specs/001-interactive-course/course-audit.md`.
