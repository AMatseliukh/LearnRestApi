import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { createTodo, deleteTodo, getTodos, updateTodo } from './api'
import { supabase } from './supabase'

// Явні кольори курсора й виділення: без них на Android каретка часто
// малюється кольором теми й буває невидимою після повторного фокуса.
const CURSOR = '#2563eb'
const SELECTION = '#bfdbfe'

export default function TodoScreen({ session }) {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  // spinner: false — тихе перечитування після зміни, щоб список
  // не блимав спінером на кожен тап.
  const load = useCallback(async ({ spinner = true } = {}) => {
    if (spinner) setLoading(true)
    setError(null)
    try {
      setTodos(await getTodos())
    } catch (err) {
      setError(err.message)
    } finally {
      if (spinner) setLoading(false)
    }
  }, [])

  // Порожній масив залежностей у load робить його стабільним,
  // тому цей ефект виконається один раз після монтування.
  useEffect(() => {
    load()
  }, [load])

  // Спільна обгортка для змін, які потребують перечитування списку.
  const mutate = async (action) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      await load({ spinner: false })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const trimmed = title.trim()

  const handleAdd = () => {
    if (trimmed === '') return
    Keyboard.dismiss()
    mutate(async () => {
      await createTodo(trimmed)
      setTitle('')
    })
  }

  // Оптимістичне перемикання: малюємо новий стан одразу, не чекаючи
  // на сервер. Якщо запит не вдасться — повертаємо як було.
  const handleToggle = async (item) => {
    const next = !item.is_done

    // Скрізь функціональна форма setTodos: два швидкі тапи по різних
    // рядках інакше прочитали б застарілий масив і перезаписали одне одного.
    setTodos((current) =>
      current.map((t) => (t.id === item.id ? { ...t, is_done: next } : t))
    )
    setError(null)

    try {
      // Відповідь сервера — джерело істини, тому підставляємо саме її,
      // а не лишаємо своє припущення.
      const saved = await updateTodo(item.id, { is_done: next })
      setTodos((current) => current.map((t) => (t.id === item.id ? saved : t)))
    } catch (err) {
      // Відкочуємо лише це поле цього рядка, а не весь масив: поки
      // запит летів, користувач міг змінити щось іще.
      setTodos((current) =>
        current.map((t) =>
          t.id === item.id ? { ...t, is_done: item.is_done } : t
        )
      )
      setError(err.message)
    }
  }

  const handleDelete = (item) => mutate(() => deleteTodo(item.id))

  const renderItem = ({ item }) => (
    <Pressable
      style={styles.row}
      onPress={() => handleToggle(item)}
      disabled={busy}
    >
      <Text style={styles.checkbox}>{item.is_done ? '☑' : '☐'}</Text>
      <Text style={[styles.rowTitle, item.is_done && styles.rowTitleDone]}>
        {item.title}
      </Text>
      <Pressable onPress={() => handleDelete(item)} disabled={busy} hitSlop={12}>
        <Text style={styles.delete}>✕</Text>
      </Pressable>
    </Pressable>
  )

  return (
    // Тап у будь-яке порожнє місце ховає клавіатуру. Дочірні елементи
    // обробляють свої натискання самі, тому кнопки й рядки працюють.
    <Pressable style={styles.screen} onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.heading}>Мої справи</Text>
          <Text style={styles.email} numberOfLines={1}>
            {session.user.email}
          </Text>
        </View>
        <Pressable onPress={() => supabase.auth.signOut()} hitSlop={8}>
          <Text style={styles.signOut}>Вийти</Text>
        </Pressable>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Що треба зробити?"
          editable={!busy}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
          cursorColor={CURSOR}
          selectionColor={SELECTION}
        />
        <Pressable
          style={[styles.addButton, (busy || trimmed === '') && styles.disabled]}
          onPress={handleAdd}
          disabled={busy || trimmed === ''}
        >
          <Text style={styles.addButtonText}>Додати</Text>
        </Pressable>
      </View>

      {error !== null && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => load()}>
            <Text style={styles.retry}>Спробувати ще</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={styles.spinner} size="large" />
      ) : (
        <FlatList
          data={todos}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          renderItem={renderItem}
          contentContainerStyle={todos.length === 0 && styles.emptyWrap}
          ListEmptyComponent={
            <Text style={styles.empty}>Список порожній</Text>
          }
        />
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 64,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingLeft: 24,
  },
  headerText: {
    flex: 1,
  },
  heading: {
    fontSize: 28,
    fontWeight: '600',
  },
  email: {
    color: '#6b7280',
    marginTop: 2,
  },
  signOut: {
    color: '#2563eb',
    fontWeight: '600',
    paddingTop: 8,
  },
  form: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.4,
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#991b1b',
  },
  retry: {
    color: '#991b1b',
    fontWeight: '600',
    marginTop: 8,
  },
  spinner: {
    marginTop: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  checkbox: {
    fontSize: 20,
  },
  rowTitle: {
    flex: 1,
    fontSize: 16,
  },
  rowTitleDone: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  delete: {
    fontSize: 18,
    color: '#9ca3af',
    paddingHorizontal: 4,
  },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    color: '#9ca3af',
    fontSize: 16,
  },
})
