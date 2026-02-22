# Book Score

Веб-приложение для:
- регистрации и входа через Supabase Auth (email + пароль);
- теста скорости чтения (слов в минуту);
- загрузки книг в `epub` и анализа (слова + оценка страниц);
- расчета времени чтения книги по вашей скорости;
- планирования чтения по дням недели с датой завершения.

## Стек
- Next.js (App Router)
- TypeScript
- Prisma + PostgreSQL
- Supabase Auth

## Локальный запуск

1. Установите зависимости:

```bash
npm install
```

2. Создайте `.env` на основе `.env.example` и заполните:

```env
DATABASE_URL="postgresql://postgres.<project-ref>:<SUPABASE_DB_PASSWORD>@aws-<region>.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres:<SUPABASE_DB_PASSWORD>@db.<project-ref>.supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<SUPABASE_PUBLISHABLE_KEY>"
GOOGLE_BOOKS_API_KEY="<GOOGLE_BOOKS_API_KEY>"
```

3. Примените миграции:

```bash
npx prisma migrate dev --name init
```

4. Запустите проект:

```bash
npm run dev
```

## Деплой на Vercel

1. Подключите репозиторий в Vercel.
2. Создайте/подключите Supabase проект (Postgres + Auth).
3. В `Environment Variables` укажите:
- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `GOOGLE_BOOKS_API_KEY` (опционально, для поиска книг через Google Books)
4. Build command оставьте стандартный `npm run build`.
5. После первого деплоя Prisma миграции применятся командой `prisma migrate deploy` в `build`-скрипте.

## Что важно
- Для точных прогнозов по времени чтения сначала пройдите тест скорости.
- Расчет страниц делается как оценка (около 300 слов на страницу).

## Google OAuth (Supabase Auth)

Чтобы вход через Google работал:

1. В Google Cloud OAuth Client добавьте redirect URI:
- `https://<project-ref>.supabase.co/auth/v1/callback`

2. В Supabase `Auth -> URL Configuration`:
- `Site URL`: `http://localhost:3000` (локально) и ваш продовый URL в Vercel
- `Additional Redirect URLs`:
  - `http://localhost:3000/auth/callback`
  - `https://<your-vercel-domain>/auth/callback`
