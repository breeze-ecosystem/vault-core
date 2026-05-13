import { View, Text, StyleSheet } from "react-native";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle: string;
  color: string;
}

export function StatsCard({ title, value, subtitle, color }: StatsCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.indicator, { backgroundColor: color }]} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    backgroundColor: "#111",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ededed",
  },
  title: {
    fontSize: 13,
    color: "#ededed",
    marginTop: 2,
  },
  subtitle: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },
});
