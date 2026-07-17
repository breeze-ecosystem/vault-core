import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { fetchRiskScores, fetchRiskSummary, type RiskScoreDto, type RiskSummaryDto } from "@/lib/api";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";
import { Gauge, TrendingUp, TrendingDown, Minus, AlertTriangle, ShieldAlert } from "lucide-react-native";

function getScoreColor(score: number): string {
  if (score >= 70) return "#ef4444";
  if (score >= 40) return "#f97316";
  if (score >= 20) return "#eab308";
  return "#22c55e";
}

function getRiskLevelLabel(level: string, t: (key: string) => string): string {
  switch (level) {
    case "low": return t("risque.low");
    case "moderate": return t("risque.moderate");
    case "elevated": return t("risque.elevated");
    case "critical": return t("risque.critical");
    default: return level;
  }
}

export default function RisqueScreen() {
  const { t } = useTranslation();
  const [scores, setScores] = useState<RiskScoreDto[]>([]);
  const [summary, setSummary] = useState<RiskSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [scoreData, summaryData] = await Promise.all([
        fetchRiskScores().catch(() => []),
        fetchRiskSummary().catch(() => null),
      ]);
      setScores(Array.isArray(scoreData) ? scoreData : []);
      setSummary(summaryData);
    } catch (e) {
      setError(t("risque.loadingError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const overallScore = summary?.overallScore ?? (
    scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.smoothedScore, 0) / scores.length)
      : 0
  );
  const riskLevel = summary?.riskLevel ?? (overallScore >= 70 ? "critical" : overallScore >= 40 ? "elevated" : overallScore >= 20 ? "moderate" : "low");
  const categoryScores = summary?.categoryScores ?? scores.map(s => ({
    category: s.zoneName || s.zoneId,
    score: s.score,
    trend: "stable" as const,
  }));
  const recommendations = summary?.recommendations ?? [];

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.headerBar}>
        <ShieldAlert size={20} color={colors.primary} />
        <Text style={styles.title}>{t("risque.title")}</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.overallCard}>
        <View style={[styles.gaugeCircle, { borderColor: getScoreColor(overallScore) }]}>
          <Text style={[styles.gaugeScore, { color: getScoreColor(overallScore) }]}>{overallScore}</Text>
        </View>
        <Text style={styles.overallLabel}>{t("risque.overallScore")}</Text>
        <Text style={[styles.overallLevel, { color: getScoreColor(overallScore) }]}>
          {getRiskLevelLabel(riskLevel, t)}
        </Text>
      </View>

      {categoryScores.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("risque.category")}</Text>
          {categoryScores.map((cat, idx) => (
            <View key={idx} style={styles.categoryCard}>
              <View style={styles.categoryLeft}>
                <Text style={styles.categoryName}>{cat.category}</Text>
              </View>
              <View style={styles.categoryRight}>
                <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(cat.score) + "20" }]}>
                  <Text style={[styles.scoreText, { color: getScoreColor(cat.score) }]}>{cat.score}</Text>
                </View>
                {cat.trend === "up" ? (
                  <TrendingUp size={16} color="#ef4444" />
                ) : cat.trend === "down" ? (
                  <TrendingDown size={16} color="#22c55e" />
                ) : (
                  <Minus size={16} color={colors.textMuted} />
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {recommendations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("risque.recommendation")}</Text>
          {recommendations.map(rec => (
            <View key={rec.id} style={styles.recCard}>
              <AlertTriangle size={14} color={rec.priority === "high" ? colors.destructive : colors.warning} />
              <Text style={styles.recText}>{rec.text}</Text>
            </View>
          ))}
        </View>
      )}

      {categoryScores.length === 0 && recommendations.length === 0 && (
        <View style={styles.empty}>
          <Gauge size={40} color={colors.border} />
          <Text style={styles.emptyText}>{t("risque.empty")}</Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  loadingText: { ...typography.caption, marginTop: spacing.md },
  scroll: { padding: spacing.lg, paddingTop: 0 },
  headerBar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
  title: { ...typography.h2, flex: 1 },
  errorBox: { padding: spacing.sm, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: borderRadius.md, marginBottom: spacing.md },
  errorText: { ...typography.caption, color: colors.destructive },
  overallCard: { alignItems: "center", padding: spacing.xl, backgroundColor: colors.elevated, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  gaugeCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 6, justifyContent: "center", alignItems: "center", marginBottom: spacing.md },
  gaugeScore: { fontSize: 36, fontWeight: "700" },
  overallLabel: { ...typography.label, fontSize: 14, marginBottom: spacing.xs },
  overallLevel: { ...typography.heading, fontSize: 18 },
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.label, fontSize: 12, marginBottom: spacing.md },
  categoryCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.elevated, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, marginBottom: spacing.sm },
  categoryLeft: { flex: 1 },
  categoryName: { ...typography.body, fontWeight: "500" },
  categoryRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  scoreText: { fontSize: 14, fontWeight: "700" },
  recCard: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, backgroundColor: colors.elevated, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, marginBottom: spacing.sm },
  recText: { ...typography.body, fontSize: 14, flex: 1 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: "center" },
});
