import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <ScreenHeader
        title="Privacy Policy"
        subtitle="Data & Privacy"
        showBack={true}
        navigation={navigation}
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.introCard} variant="subtle" padding="md">
          <Text style={styles.introBadge}>PRIVACY OVERVIEW</Text>
          <Text style={styles.introText}>
            InternMatch AI is an assistive platform designed to help students and early-career candidates
            discover relevant internship opportunities. This policy explains how data is handled
            when using InternMatch AI.
          </Text>
        </Card>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Account & Profile Information</Text>
          <Text style={styles.bodyText}>
            When you create an account, InternMatch stores the account and profile information you
            provide, such as your email address, full name, account type, and supported profile fields.
            This information is used to provide authentication, profile features, and matching.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. CV & Document Processing</Text>
          <Text style={styles.bodyText}>
            Uploaded CVs are processed to extract information such as skills,
            education, experience, and project highlights used for profile enrichment and matching. CV files
            are not intended to be publicly displayed. Relevant CV content may be sent to configured AI providers for extraction and analysis.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. AI-Assisted Matching</Text>
          <Text style={styles.bodyText}>
            Our matching intelligence analyzes requirements from internship listings against your
            structured profile details. AI-assisted features may also generate match explanations and cover letter drafts.
            These outputs are assistive and should be reviewed by you before use.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Applications & Interaction Data</Text>
          <Text style={styles.bodyText}>
            Information about internships you save or track is stored to keep your
            application pipeline organized within the app. Generated application materials may also be stored or displayed as part of the relevant workflow.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Infrastructure & Security</Text>
          <Text style={styles.bodyText}>
            InternMatch uses Supabase for authentication and storage, together with backend services
            for application data and AI workflows. Protected app data is accessed through authenticated
            sessions and the app's configured authorization controls.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. User Control & Data Management</Text>
          <Text style={styles.bodyText}>
            You can update supported profile information through the app.
            Self-service account deletion is not currently available in this build. If this changes,
            this policy should be updated to describe the available account and data controls.
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
