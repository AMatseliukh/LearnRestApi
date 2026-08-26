import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'

import AuthScreen from './AuthScreen'
import TodoScreen from './TodoScreen'
import { supabase } from './supabase'

export default function App() {
  const [session, setSession] = useState(null)
  // Поки не прочитали збережену сесію, не можна показувати екран входу:
  // залогінений користувач побачив би його на мить при кожному запуску.
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setSession(data.session)
      setReady(true)
    })

    // Ловить і вхід, і вихід, і автооновлення токена. Завдяки цьому
    // екрани перемикаються самі, без ручних викликів після signIn.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => {
      alive = false
      data.subscription.unsubscribe()
    }
  }, [])

  return (
    <View style={styles.root}>
      <StatusBar style="auto" />
      {!ready ? (
        <ActivityIndicator style={styles.spinner} size="large" />
      ) : session ? (
        <TodoScreen session={session} />
      ) : (
        <AuthScreen />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  spinner: {
    flex: 1,
  },
})
