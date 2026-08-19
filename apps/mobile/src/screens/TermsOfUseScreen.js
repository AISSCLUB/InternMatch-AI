import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';

export default function TermsOfUseScreen({ navigation }) {
  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <ScreenHeader
        title="Terms of Use"
        subtitle="Using InternMatch"
        showBack={true}
        navigation={navigation}
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.introCard} variant="subtle" padding="md">
          <Text style={styles.introBadge}>TERMS OF USE</Text>
          <Text style={styles.introText}>
            These Terms describe the conditions for using InternMatch AI. Please read them
            before using the app and its AI-assisted internship features.
          </Text>
        </Card>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Purpose of InternMatch</Text>
          <Text style={styles.bodyText}>
            InternMatch AI is an assistive internship platform designed to support the
            internship discovery, profile-based match analysis, application preparation, and tracking for students and
            early-career candidates.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Assistive AI & User Review</Text>
          <Text style={styles.bodyText}>
            AI-generated recommendations, matchup insights, and draft cover letters are designed to
            assist you. They do not constitute professional career advice and should always be reviewed
            and edited by you before submission to employers.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. No Guarantee of Employment</Text>
          <Text style={styles.bodyText}>
            InternMatch AI facilitates discovery and preparation but does not guarantee internship
            placements, interview invitations, or employment offers from listed companies or recruiters.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. User Responsibilities & Conduct</Text>
          <Text style={styles.bodyText}>
            You agree to provide accurate and truthful information in your profile and uploaded CVs.
            You are responsible for maintaining the confidentiality of your account credentials.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Third-Party Services</Text>
          <Text style={styles.bodyText}>
            InternMatch relies on third-party services for functions such as authentication, storage,
            and AI-assisted processing. Third-party services may have their own terms and privacy practices.
            Where external internship or employer links are provided, you are responsible for reviewing those external sites.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Product Status & Availability</Text>
          <Text style={styles.bodyText}>
            InternMatch AI is under active development. Features and service availability may be updated,
            modified, or refined over time. The service may also experience interruptions during development.
          </Text>
        </View>

        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            Last updated: August 2026 | InternMatch AI
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background || colors.screenBg,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontalPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxxl,
  },
  introCard: {
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent || colors.teal,
  },
  introBadge: {
    ...typography.eyebrow,
    color: colors.accentStrong || colors.tealDark,
    marginBottom: spacing.xs,
  },
  introText: {
    ...typography.body,
    color: colors.textSecondary || colors.textMuted,
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary || colors.textDark,
    marginBottom: spacing.xs,
  },
  bodyText: {
    ...typography.body,
    color: colors.textSecondary || colors.textMuted,
    lineHeight: 21,
  },
  footerNote: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle || colors.border,
    alignItems: 'center',
  },
  footerText: {
    ...typography.caption,
    color: colors.textTertiary || colors.textMuted,
    textAlign: 'center',
  },
});
