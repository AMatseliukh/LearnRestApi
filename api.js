// Єдине місце в застосунку, де відбуваються мережеві виклики до воркера.
// Компоненти імпортують звідси функції й нічого не знають про fetch,
// URL, токени чи коди статусів.

import Constants from 'expo-constants'

import { supabase } from './supabase'

// Порт, на якому слухає воркер: npx wrangler dev --ip 0.0.0.0
const API_PORT = 8787

// Адреса визначається у два кроки.
//
// 1. EXPO_PUBLIC_API_URL, якщо заданий — має пріоритет. Знадобиться після
//    деплою воркера, коли адреса стане публічним https-URL.
// 2. Інакше беремо хост, з якого телефон щойно завантажив бандл, і
//    підставляємо порт воркера. Metro і воркер крутяться на одному
//    ноутбуці, тому IP у них спільний — і при зміні адреси роутером
//    нічого правити не треба, достатньо пересканувати QR.
function resolveBaseUrl() {
  const explicit = process.env.EXPO_PUBLIC_API_URL
  if (explicit) {
    return explicit.replace(/\/+$/, '')
  }

  // expoConfig за документацією може бути null, а hostUri гарантований
  // лише в режимі розробки — звідси обережний доступ.
  const hostUri = Constants.expoConfig?.hostUri
  if (hostUri) {
    const host = hostUri.split(':')[0]
    return `http://${host}:${API_PORT}`
  }

  return null
}

const BASE_URL = resolveBaseUrl()

// Воркер вимагає Bearer-токен на всіх роутах /todos. Беремо його з
// поточної сесії; getSession сам оновить токен, якщо той протух.
async function authHeader() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw new Error('Не вдалося прочитати сесію. Спробуй увійти знову.')
  }

  const token = data.session?.access_token

  if (!token) {
    throw new Error('Сесія завершилась. Увійди знову.')
  }

  return { Authorization: `Bearer ${token}` }
}

// Внутрішній помічник. Назовні не експортується.
async function request(path, options = {}) {
  if (!BASE_URL) {
    throw new Error(
      'Не вдалося визначити адресу API. Задай EXPO_PUBLIC_API_URL у .env.local.'
    )
  }

  const auth = await authHeader()

  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { ...options.headers, ...auth },
    })
  } catch {
    // Сюди потрапляємо, лише коли запит не дійшов узагалі:
    // немає Wi-Fi, воркер не запущений, не той порт.
    throw new Error(`Не вдалося зв'язатися з сервером (${BASE_URL})`)
  }

  // 204 No Content: тіла немає, розбирати нічого.
  if (res.status === 204) {
    return null
  }

  const body = await res.json().catch(() => null)

  // fetch НЕ кидає виняток на 401 чи 500 — перевіряємо самі.
  if (!res.ok) {
    throw new Error(body?.error ?? `Запит не вдався (HTTP ${res.status})`)
  }

  return body
}

// POST і PATCH шлють JSON — без цього заголовка воркер відповість
// 400 "Body must be valid JSON".
const jsonOptions = (method, payload) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})

export function getTodos() {
  return request('/todos')
}

export function getTodo(id) {
  return request(`/todos/${id}`)
}

export function createTodo(title) {
  return request('/todos', jsonOptions('POST', { title }))
}

export function updateTodo(id, patch) {
  return request(`/todos/${id}`, jsonOptions('PATCH', patch))
}

export function deleteTodo(id) {
  return request(`/todos/${id}`, { method: 'DELETE' })
}
