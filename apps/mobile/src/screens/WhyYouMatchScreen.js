import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import colors from '../theme/colors';
import GradientButton from '../components/GradientButton';

const MATCHED_SKILLS = ['Python', 'Machine Learning', 'SQL'];
const SKILL_GAPS = ['Docker', 'AWS'];

function ScoreRing({ score, size = 150, strokeWidth = 12 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (score / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#E1EEF0" strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.tealDark}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={styles.scoreText}>%{score}</Text>
    </View>
  );
}

export default function WhyYouMatchScreen({ route, navigation }) {
  const score = route?.params?.internship?.score ?? 94;

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={colors.textDark} />
      </TouchableOpacity>

      <Text style={styles.title}>Why You Match</Text>

      <View style={styles.ringWrap}>
        <ScoreRing score={score} />
      </View>

      {MATCHED_SKILLS.map((s) => (
        <View style={styles.row} key={s}>
          <Ionicons name="checkmark" size={18} color={colors.green} />
          <Text style={styles.rowText}>{s}</Text>
        </View>
      ))}

      <Text style={styles.gapTitle}>Skill Gap</Text>
      {SKILL_GAPS.map((s) => (
        <View style={styles.row} key={s}>
          <Ionicons name="triangle-outline" size={16} color={colors.orange} />
          <Text style={[styles.rowText, { color: colors.orange }]}>{s}</Text>
        </View>
      ))}

      <GradientButton
        title="Prepare the application"
        color={colors.teal}
        onPress={() => navigation.navigate('CoverLetterDraft')}
        style={{ marginTop: 28 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cardBg, padding: 20 },
  backBtn: { marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: colors.textDark, textAlign: 'center', marginBottom: 10 },
  ringWrap: { alignItems: 'center', marginVertical: 16 },
  scoreText: { position: 'absolute', fontSize: 28, fontWeight: '700', color: colors.tealDark },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  rowText: { marginLeft: 8, fontWeight: '600', color: colors.textDark },
  gapTitle: { textAlign: 'center', fontWeight: '700', color: colors.textDark, marginTop: 18 },
});
