# Fillout → Bitrix24 через Vercel

## Что делает проект
Принимает POST webhook от Fillout и отправляет данные в Bitrix24 через `crm.item.add`.

## Структура
- `api/fillout-to-bitrix.js` — серверная функция Vercel
- `.env.local` — переменные окружения

## Установка
```bash
npm install