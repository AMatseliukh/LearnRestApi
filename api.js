// Єдине місце в застосунку, де відбуваються мережеві виклики.
// Компоненти імпортують звідси функції й нічого не знають про fetch,
// URL чи коди статусів.

const BASE_URL = process.env.EXPO_PUBLIC_API_URL

// Внутрішній помічник. Назовні не експортується.
async function request(path, options) {
  if (!BASE_URL) {
    throw new Error(
      'EXPO_PUBLIC_API_URL не заданий. Перевір .env.local і перезавантаж застосунок.'
    )
  }

  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, options)
  } catch {
    // Сюди потрапляємо, лише коли запит не дійшов узагалі:
    // немає Wi-Fi, воркер не запущений, не той IP.
    throw new Error(`Не вдалося зв'язатися з сервером (${BASE_URL})`)
  }

  // 204 No Content: тіла немає, розбирати нічого.
  if (res.status === 204) {
    return null
  }

  const body = await res.json().catch(() => null)

  // fetch НЕ кидає виняток на 404 чи 500 — перевіряємо самі.
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
