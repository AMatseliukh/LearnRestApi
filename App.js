import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'

import { createTodo, deleteTodo, getTodos, updateTodo } from './api'

export default function App() {
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

  // Спільна обгортка для всіх змін: вимкнути кнопки, виконати дію,
  // перечитати список, показати помилку якщо була.
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
    mutate(async () => {
      await createTodo(trimmed)
      setTitle('')
    })
  }

  const handleToggle = (item) =>
    mutate(() => updateTodo(item.id, { is_done: !item.is_done }))

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
    <View style={styles.screen}>
      <StatusBar style="auto" />

      <Text style={styles.heading}>Мої справи</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Що треба зробити?"
          editable={!busy}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
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
          renderItem={renderItem}
          contentContainerStyle={todos.length === 0 && styles.emptyWrap}
          ListEmptyComponent={
            <Text style={styles.empty}>Список порожній</Text>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 64,
    paddingHorizontal: 16,
  },
  heading: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 16,
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
