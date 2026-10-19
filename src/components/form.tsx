import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Colors, Fonts, Spacing } from '@/constants/theme';

export function Field({ label, ...input }: { label: string } & TextInputProps) {
  return (
    <View style={{ gap: Spacing.one }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={Colors.textSecondary} {...input} style={[styles.input, input.multiline && styles.multiline]} />
    </View>
  );
}

export function Choice<T extends string>({ label, options, value, onChange }: { label: string; options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ gap: Spacing.one }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {options.map(([key, text]) => (
          <Pressable key={key} onPress={() => onChange(key)} style={[styles.option, value === key && styles.optionOn]}>
            <Text style={[styles.optionText, value === key && { color: Colors.onAccent }]}>{text}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function SubmitButton({ title, onPress, busy, disabled }: { title: string; onPress: () => void; busy?: boolean; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={busy || disabled} style={[styles.submit, (busy || disabled) && { opacity: 0.5 }]}>
      {busy ? <ActivityIndicator color={Colors.onAccent} /> : <Text style={styles.submitText}>{title}</Text>}
    </Pressable>
  );
}

export const formStyles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three, maxWidth: 600, width: '100%', alignSelf: 'center' },
  hint: { color: Colors.textSecondary, fontFamily: Fonts.body, fontSize: 14, lineHeight: 20 },
  error: { color: Colors.danger, fontSize: 15 },
});

const styles = StyleSheet.create({
  label: { color: Colors.text, fontFamily: Fonts.bodyBold, fontSize: 15 },
  input: { color: Colors.text, backgroundColor: Colors.backgroundElement, padding: Spacing.three, borderRadius: 12, fontSize: 16 },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  option: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: Colors.backgroundElement },
  optionOn: { backgroundColor: Colors.accent },
  optionText: { color: Colors.text, fontFamily: Fonts.bodyBold },
  submit: { padding: Spacing.three, borderRadius: 999, alignItems: 'center', backgroundColor: Colors.accent },
  submitText: { color: Colors.onAccent, fontSize: 17, fontFamily: Fonts.bodyBold },
});
