# freecode

<p align="center">
  <a href="#лицензия"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-8b93ff?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/Electron-33-47848f?style=flat-square&logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-%3E%3D%2016-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node">
</p>

<p align="center">
  <a href="README.md">English</a> · <strong>Русский</strong>
</p>

**freecode** — AI-агент для рабочего стола, не расходующий токены. Он встраивает
веб-чат [z.ai](https://chat.z.ai/) в нативное окно Electron и превращает этот чат
в локальный исполнитель: модели даётся инструкция отвечать вызовами инструментов —
JavaScript внутри блока кода ```free, preload-скрипт перехватывает эти блоки,
выполняет их в изолированной VM в главном процессе и отправляет вывод обратно
модели. Никаких API-ключей и оплаты токенов — используется ваш обычный аккаунт.

---

## Зачем это нужно

Веб-чаты хорошо *думают*, но не могут *действовать* на вашей машине. freecode
замыкает этот цикл:

- **Мультиплатформенность** — из коробки адаптеры для z.ai и DeepSeek; новый чат-сайт = один файл-адаптер.
- **Нулевая стоимость токенов** — всё идёт через веб-интерфейс сайта, без API.
- **Настоящий агентный цикл** — Думай → Действуй → Наблюдай → Повторяй. Файлы, поиск по коду, команды оболочки.
- **Нативная оболочка** — Electron-обёртка с небольшой панелью управления.
- **Постоянный вход** — логинитесь один раз; сессия хранится вне приложения и переиспользуется при каждом запуске.

---

## Возможности

- **Вызовы инструментов как блоки кода.** Модель отвечает блоками ```free; каждый блок разбирается из DOM, выполняется в изолированной VM, а его вывод возвращается в чат сообщением пользователя.
- **Изолированное выполнение.** `vm.createContext` с `codeGeneration: { strings: false, wasm: false }`; нет `require`, `process`, `global`; лимит 30 с на синхронный код и 60 с на весь блок.
- **Динамический реестр инструментов.** Каждый инструмент описывает свою сигнатуру, поэтому системный промпт собирается из реестра — добавили инструмент, и он уже задокументирован.
- **Защита от опасных команд.** Deny-list блокирует разрушительные команды (`rm -rf /`, `format C:`, `mkfs`, `shutdown`, …) до вызова оболочки.
- **Вход один раз.** При первом запуске открывается `/auth`, после успешного входа ставится маркер, и дальше приложение стартует сразу в чате.
- **Маскировка под Chrome.** User-Agent и Client Hints переписываются, чтобы z.ai видел обычный браузер Chrome.
- **Панель управления.** Показывает текущий каталог проекта, позволяет сменить его, настроить задержку отправки и отображает выполняемую задачу с её результатом.
- **Локализованный интерфейс.** Панель поддерживает английский и русский, язык выбирается из локали браузера и переключается на лету кнопкой `EN`/`RU` в панели (выбор сохраняется в `settings.json`).
- **Переносимая папка данных.** Всё постоянное хранится в `<home>/freecode` (см. ниже).

---

## Требования

- Node.js >= 16
- npm

## Быстрый старт

```bash
git clone <your-repo-url>
cd ZAIToType

npm install
npm start
```

`npm start` собирает TypeScript в `dist/` и запускает Electron.

### Первый запуск

1. Открывается страница авторизации z.ai. Войдите один раз (Google / Email / GitHub).
2. После успешного входа записывается маркер, и приложение переходит в чат.
3. Нажмите **Select project** в панели справа внизу и выберите каталог.
   freecode отправит в чат промпт агента — список инструментов, информацию о
   платформе и дерево проекта.
4. Общайтесь с моделью. Когда она ответит блоком ```free, инструменты выполнятся,
   а результат автоматически вернётся модели.

### Скрипты

| Команда | Описание |
| --- | --- |
| `npm start` | Собрать и запустить приложение |
| `npm run build` | Скомпилировать TypeScript и скопировать промпт-ассеты в `dist/` |
| `npm run watch` | Пересборка при изменениях (в отдельном терминале) |
| `npm run clean` | Удалить `dist/` и `release/` |
| `npx tsc --noEmit` | Проверка типов без записи файлов |
| `npm run build:win` | Собрать установщик Windows, portable exe и zip |
| `npm run build:win:portable` | Собрать только portable exe для Windows |
| `npm run build:win:local` | Как `build:win`, но без публикации |

---

## Папка данных

Все постоянные данные лежат вне приложения, в `<home>/freecode`:

| Платформа | Путь |
| --- | --- |
| Windows | `C:\Users\<user>\freecode` |
| macOS | `/Users/<user>/freecode` |
| Linux | `/home/<user>/freecode` |

Путь можно переопределить переменной окружения `FREE_CODE_HOME`.

В папке хранятся профиль Chromium (сессия входа), кэши, маркер `.logged-in`,
файл `settings.json` (задержка отправки и язык интерфейса) и `projects.json`
(какой каталог проекта привязан к какому чату).
Удаление папки сбрасывает вход; обновление или переустановка приложения её
**не** затрагивают.

---

## Доступные инструменты

Инструменты регистрируются в `createDefaultRegistry()` и доступны внутри каждого
блока ```free как асинхронные функции.

| Инструмент | Сигнатура | Описание |
| --- | --- | --- |
| `read` | `read(filePath, { offset?, limit? })` | Чтение UTF-8 файла с нумерацией строк |
| `write` | `write(filePath, content)` | Создать или перезаписать файл |
| `edit` | `edit(filePath, oldString, newString, replaceAll?, dryRun?)` | Заменить литеральную строку |
| `deleteFile` | `deleteFile(filePath)` | Удалить один файл |
| `glob` | `glob(pattern, searchPath?)` | Поиск файлов по маске |
| `grep` | `grep(pattern, { path?, include? })` | Поиск по содержимому регуляркой |
| `bash` | `bash(command, { workdir?, timeoutMs? })` | Команда оболочки (cmd.exe на Windows) |
| `pwsh` | `pwsh(command, { workdir?, timeoutMs? })` | Команда PowerShell |

Псевдонимы для совместимости: `readLines` → `read`, `writeFile` → `write`,
`editFile` → `edit`. Хелпер `log(...)` печатает промежуточные значения, а
`projectDir` хранит корень проекта.

### Пример вызова

```free
const pkg = JSON.parse(await read("package.json"));
log("name:", pkg.name);
log("version:", pkg.version);
log("scripts:", Object.keys(pkg.scripts || {}).join(", "));
```

---

## Релизы

Релизы управляются двумя workflow:

- **CI: Build** (`.github/workflows/build.yml`) — запускается на каждый пуш в
  `main`. Проверяет типы и собирает установщик NSIS, **portable-исполняемый
  файл** и zip, затем загружает их как артефакты. Версию **не** поднимает и
  релиз **не** публикует.
- **Release: Build & Publish** (`.github/workflows/release.yml`) — запускается
  только на тегах `v*`. Синхронизирует версию из тега, собирает и публикует
  GitHub Release с прикреплёнными артефактами.

Чтобы выпустить релиз:

```bash
git tag v0.2.0
git push origin v0.2.0
```

Локальная сборка: `npm run build:win:portable:local`, артефакты попадают в
`release/`.

## Платформы

freecode построен вокруг подключаемых **провайдеров** — по одному адаптеру на
каждый чат-сайт. Всё специфичное для сайта (селекторы, URL, определение входа,
темы, разбор id диалога) лежит в одном файле в `src/providers/`.

Встроенные провайдеры:

| Провайдер | Сайт | Страница входа | Session partition |
| --- | --- | --- | --- |
| `zai` | chat.z.ai | `/auth` | `persist:zai` |
| `deepseek` | chat.deepseek.com | (главная) | `persist:deepseek` |

У каждого провайдера **свой session partition**, поэтому входы не смешиваются
между платформами. Активная платформа хранится в `settings.json`
(`providerId`) и переключается на лету из панели.

### Как добавить провайдера

Создайте `src/providers/<id>.ts`, экспортирующий `Provider` (см.
`src/shared/types.ts`), и зарегистрируйте его в `src/providers/index.ts`.
Больше ничего менять не нужно — окно, агентный цикл, панель, детектор входа,
тема и хранилище сессий не зависят от платформы.

## Архитектура

```
src/
  main/        Главный процесс Electron
    index.ts            Запуск приложения, жизненный цикл окна, маскировка UA
    window.ts           Создание BrowserWindow (постоянный partition)
    ipc.ts              IPC-обработчики (execute-js, init-project, …)
    project-context.ts  Дерево каталогов + сборка системного промпта
    window-context.ts   Каталог проекта на окно + отслеживание сессии
    project-store.ts    Постоянная связь sessionId → каталог проекта
    paths.ts            Корень данных <home>/freecode и маркер входа
    settings-store.ts   Настройки пользователя (задержка отправки, язык)
    user-agent.ts       Маскировка User-Agent / Client Hints под Chrome

  preload/     Внедряется в страницу z.ai
    index.ts            Запуск, синхронизация при SPA-навигации
    observer.ts         Агентный цикл (ждёт завершённые ответы)
    block-parser.ts     Извлечение блоков ```free
    chat-input.ts       Заполнение и отправка в композер
    overlay.ts          Панель управления справа внизу
    login-detector.ts   Детектор однократного входа
    stealth.ts          Маскировка navigator.webdriver / window.chrome
    i18n/               Переводы панели (en, ru) и хелпер t()
    ipc.ts, api.ts      Типизированный доступ к IPC из preload

  providers/   Адаптеры сайтов
    zai.ts              Селекторы и DOM-хелперы z.ai
    index.ts            Реестр провайдеров

  tools/       Реализации инструментов + песочница
    types.ts            ToolDefinition, ok/fail, asObject
    ToolRegistry.ts     Реестр инструментов
    JsRunner.ts         VM-песочница для блоков ```free
    FileReadTool.ts, FileWriteTool.ts, FileEditTool.ts, FileDeleteTool.ts
    GlobTool.ts, GrepTool.ts, BashTool.ts, PwshTool.ts
    dangerous.ts        Deny-list опасных команд
    path-utils.ts       Разрешение путей относительно проекта

  shared/      Кросс-процессные константы и типы
  prompt/      system.md — шаблон инструкции агенту

scripts/
  copy-assets.js        Копирует не-TS ассеты (шаблоны промптов) в dist/
```

### Как работает агентный цикл

1. Пользователь выбирает проект; главный процесс собирает системный промпт
   (шаблон + сгенерированный список инструментов + платформа + дерево проекта).
2. Модель отвечает одним или несколькими блоками ```free.
3. `observer.ts` ждёт завершения ответа (кнопка отправки возвращается в композер)
   и извлекает блоки из DOM (`div.language-free`).
4. Каждый блок уходит по IPC в `JsRunner`, который выполняет его в VM и
   возвращает текстовый дайджест.
5. Объединённый дайджест вставляется в композер и отправляется обратно модели.
6. Модель анализирует вывод и продолжает работу или выдаёт итоговый ответ.

---

## Участие в разработке

Мы рады вкладу сообщества. Порядок работы, стиль кода и инструкция по добавлению
нового инструмента описаны в [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Лицензия

[MIT](LICENSE)
