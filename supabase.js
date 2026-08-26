// Клієнт Supabase для застосунку. Використовує ЛИШЕ anon-ключ —
// service_role на телефон не потрапляє ніколи.
//
// Цей імпорт має бути першим: він встановлює глобальний localStorage
// на базі expo-sqlite, і саме в ньому supabase-js зберігає сесію.
import 'expo-sqlite/localStorage/install'

import { AppState } from 'react-native'
import { createClient } from '@supabase/supabase-js'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Немає EXPO_PUBLIC_SUPABASE_URL або EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Перевір .env.local і перезапусти npm start.'
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: localStorage,
    // Токен живе близько години — оновлювати треба самим.
    autoRefreshToken: true,
    // Сесія переживає перезапуск застосунку.
    persistSession: true,
    // На телефоні немає URL, з якого можна дістати сесію.
    detectSessionInUrl: false,
  },
})

// Оновлювати токен має сенс лише поки застосунок на екрані. У фоні
// таймер усе одно не спрацює надійно, тож зупиняємо його явно.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})
