import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo } from 'react';
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Colors } from '@/constants/theme';

const native = Platform.OS !== 'web';

// Stage lights hanging from the top edge: where they sit (share of the
// width), their color, and how far and how fast they sweep.
const BEAMS = [
  { x: 0.12, color: Colors.accent, from: -32, to: 8, ms: 3400 },
  { x: 0.38, color: '#B06BFF', from: 18, to: -14, ms: 2700 },
  { x: 0.62, color: '#2FD3E0', from: -20, to: 22, ms: 3100 },
  { x: 0.9, color: Colors.accent, from: 30, to: -6, ms: 3800 },
];

// Club lights behind the welcome screen: sweeping beams, glowing lamps and a
// short strobe flash every couple of seconds. The bottom fades to the
// background so the buttons stay easy to read.
export function StrobeLights() {
  const { width, height } = useWindowDimensions();
  const length = Math.max(height, 700) * 1.1;
  const beamWidth = Math.max(90, Math.min(width, 520) * 0.32);

  const sweeps = useMemo(() => BEAMS.map(() => new Animated.Value(0)), []);
  const strobe = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const loops = sweeps.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration: BEAMS[i].ms, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
          Animated.timing(value, { toValue: 0, duration: BEAMS[i].ms, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        ]),
      ),
    );
    const flash = (to: number, ms: number) => Animated.timing(strobe, { toValue: to, duration: ms, useNativeDriver: native });
    const strobeLoop = Animated.loop(
      Animated.sequence([Animated.delay(1700), flash(1, 50), flash(0, 90), Animated.delay(110), flash(0.7, 50), flash(0, 160)]),
    );
    loops.forEach((l) => l.start());
    strobeLoop.start();
    return () => {
      loops.forEach((l) => l.stop());
      strobeLoop.stop();
    };
  }, [sweeps, strobe]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.box]}>
      <LinearGradient colors={['#1B2A14', Colors.background]} locations={[0, 0.6]} style={StyleSheet.absoluteFill} />
      {BEAMS.map((beam, i) => {
        const rotate = sweeps[i].interpolate({ inputRange: [0, 1], outputRange: [`${beam.from}deg`, `${beam.to}deg`] });
        // The beam turns around the middle of a box twice its length, so it
        // pivots at the lamp on the top edge; only the lower half is lit.
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: `${beam.x * 100}%`,
              top: -length,
              width: beamWidth,
              height: length * 2,
              marginLeft: -beamWidth / 2,
              transform: [{ rotate }],
            }}>
            <View style={{ flex: 1 }} />
            <LinearGradient
              colors={['transparent', `${beam.color}38`, `${beam.color}66`, `${beam.color}38`, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        );
      })}
      {BEAMS.map((beam, i) => (
        <View
          key={`lamp${i}`}
          style={[styles.lamp, { left: `${beam.x * 100}%`, backgroundColor: beam.color, boxShadow: `0 0 28px 10px ${beam.color}88` }]}
        />
      ))}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', opacity: Animated.multiply(strobe, 0.13) }]} />
      <LinearGradient colors={['transparent', Colors.background]} locations={[0.35, 0.82]} style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden', backgroundColor: Colors.background },
  lamp: { position: 'absolute', top: -6, width: 14, height: 14, marginLeft: -7, borderRadius: 7, opacity: 0.9 },
});
