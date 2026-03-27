# Phase 2.1 — Vite Scaffold: инструкция по установке

## Что в комплекте

```
package.json           — npm зависимости (Vite)
vite.config.js         — конфигурация Vite для GitHub Pages
main.js                — entry point (пока пустой)
.gitignore             — исключаем node_modules и dist
.github/workflows/deploy.yml — автодеплой при push в main
index.html             — твой дашборд + 1 строка: <script type="module" src="/main.js">
```

## Шаг 1: Подготовь репозиторий

```bash
# Перейди в папку проекта
cd ~/путь/к/Dashboard

# Если ещё нет git:
# git init
# git remote add origin https://github.com/godfathxrpe/Dashboard.git
```

## Шаг 2: Добавь новые файлы

Скопируй из скачанного архива в корень проекта:
- `package.json`
- `vite.config.js`
- `main.js`
- `.gitignore`
- `.github/workflows/deploy.yml` (создай папки `.github/workflows/`)
- `index.html` (замени старый — в новом добавлена 1 строка на line 27)

**Важно**: `manifest.json` и `sw.js` оставь как есть.
Vite автоматически копирует файлы из корня в `dist/` при сборке.

## Шаг 3: Установи зависимости и проверь локально

```bash
# Установи Node.js если ещё нет: https://nodejs.org (LTS версия)

# Установи зависимости
npm install

# Запусти dev-сервер
npm run dev
```

Откроется `http://localhost:3000` — ты увидишь свой дашборд.
В консоли браузера должно быть: `[Dashboard] Vite entry loaded. v3.1`

Если всё работает — Phase 2.1 на локалке готов.

## Шаг 4: Настрой GitHub Pages для Actions

Это нужно сделать ОДИН РАЗ в настройках репозитория:

1. Зайди на **GitHub → Dashboard repo → Settings → Pages**
2. В разделе **"Build and deployment"** → **Source** выбери **"GitHub Actions"**
   (вместо "Deploy from a branch")
3. Сохрани

## Шаг 5: Push и проверь деплой

```bash
git add .
git commit -m "Phase 2.1: add Vite scaffold + GitHub Actions deploy"
git push origin main
```

Зайди в **GitHub → Actions** — увидишь запущенный workflow "Deploy to GitHub Pages".
Через 1-2 минуты сайт на `godfathxrpe.github.io/Dashboard/` обновится.

## Шаг 6: Проверь production

Открой `https://godfathxrpe.github.io/Dashboard/`
- Дашборд работает как раньше
- В DevTools Console: `[Dashboard] Vite entry loaded. v3.1`
- Авторизация работает
- Синхронизация работает

## Что поменялось

| Было | Стало |
|------|-------|
| Push HTML → GitHub Pages | Push код → Actions build → Pages deploy |
| Нет dev-сервера | `npm run dev` с hot reload |
| 1 файл 13K строк | 1 файл 13K строк + scaffold (пока) |
| Нет package.json | Есть, можно ставить npm-пакеты |

## Что НЕ поменялось

- HTML структура дашборда — та же
- Вся логика — та же, в inline скриптах
- CSS — тот же, inline
- Supabase — тот же URL, тот же ключ
- PWA — тот же manifest.json, тот же sw.js

## Troubleshooting

**`npm run dev` — белый экран**
→ Проверь что `main.js` есть в корне проекта (рядом с index.html)

**GitHub Actions падает на `npm ci`**
→ Убедись что `package-lock.json` запушен. Если его нет — запусти `npm install`
   локально, он создаст lock-файл, потом `git add package-lock.json`

**Шрифт Manrope не грузится при `npm run dev`**
→ Шрифт подключен через Google Fonts CDN — работает и в dev и в prod

**Supabase redirectTo не совпадает**
→ URL остаётся `godfathxrpe.github.io/Dashboard/` — ничего менять не нужно

## Следующий шаг: Phase 2.2

Когда Phase 2.1 проверен и работает — переходим к выносу CSS:
- Вырезаем `<style>` блоки из index.html → в файлы `styles/*.css`
- `main.js` получает `import './styles/main.css'`
- index.html становится на 5 500 строк короче
