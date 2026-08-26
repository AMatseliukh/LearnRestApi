import { useState } from 'react'
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { supabase } from './supabase'

// Явні кольори курсора й виділення. Без них на Android каретка часто
// малюється кольором теми й буває невидимою після повторного фокуса.
const CURSOR = '#2563eb'
const SELECTION = '#bfdbfe'

export default function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const ready = email.trim() !== '' && password !== ''

  // Успішний вхід не змінює тут нічого: слухач onAuthStateChange у App.js
  // сам побачить нову сесію й перемкне екран.
  const run = async (action) => {
    Keyboard.dismiss()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await action()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleSignIn = () =>
    run(async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw error
    })

  const handleSignUp = () =>
    run(async () => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      if (error) throw error

      // Якщо підтвердження пошти увімкнене, сесії одразу не буде.
      if (!data.session) {
        setNotice('Акаунт створено. Підтверди пошту й увійди.')
      }
    })

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Тап у будь-яке порожнє місце ховає клавіатуру. Дочірні
          елементи обробляють свої натискання самі, тому кнопки й
          поля продовжують працювати. */}
      <Pressable style={styles.screen} onPress={Keyboard.dismiss} accessible={false}>
        <Text style={styles.heading}>Мої справи</Text>
        <Text style={styles.subheading}>Увійди, щоб побачити свій список</Text>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Пошта"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!busy}
          cursorColor={CURSOR}
          selectionColor={SELECTION}
        />

        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            value={password}
            onChangeText={setPassword}
            placeholder="Пароль"
            // Перемикається лише цей проп — сам TextInput не
            // перемонтовується, тому фокус і текст зберігаються.
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            editable={!busy}
            cursorColor={CURSOR}
            selectionColor={SELECTION}
          />
          <Pressable
            style={styles.eye}
            onPress={() => setShowPassword((v) => !v)}
            disabled={busy}
            hitSlop={8}
            accessibilityLabel={showPassword ? 'Сховати пароль' : 'Показати пароль'}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color="#6b7280"
            />
          </Pressable>
        </View>

        {error !== null && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {notice !== null && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        )}

        {busy ? (
          <ActivityIndicator style={styles.spinner} />
        ) : (
          <>
            <Pressable
              style={[styles.primary, !ready && styles.disabled]}
              onPress={handleSignIn}
              disabled={!ready}
            >
              <Text style={styles.primaryText}>Увійти</Text>
            </Pressable>

            <Pressable
              style={[styles.secondary, !ready && styles.disabled]}
              onPress={handleSignUp}
              disabled={!ready}
            >
              <Text style={styles.secondaryText}>Зареєструватися</Text>
            </Pressable>
          </>
        )}
      </Pressable>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: '600',
  },
  subheading: {
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  passwordRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    // місце під іконку, щоб текст не заповзав під неї
    paddingRight: 48,
  },
  eye: {
    position: 'absolute',
    right: 8,
    // компенсує marginBottom самого поля, щоб іконка стояла по центру
    top: 0,
    bottom: 12,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
  noticeBox: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  noticeText: {
    color: '#1e40af',
  },
  spinner: {
    marginTop: 12,
  },
  primary: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondary: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 16,
  },
  disabled: {
    opacity: 0.4,
  },
})
