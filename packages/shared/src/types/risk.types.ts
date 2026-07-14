export interface RiskFactors {
  deniedAttempts: number;
  openDoorAnomalies: number;
  anomalyEvents: number;
  activeIncidents: number;
  failedReaders: number;
  hoursSinceLastEvent: number;
}

export interface RiskScoreDto {
  zoneId: string;
  siteId: string;
  zoneName: string;
  siteName: string;
  score: number;
  smoothedScore: number;
  riskLevel: "low" | "moderate" | "elevated" | "critical";
  factors: RiskFactors;
  timestamp: string;
}

export interface RiskTrendPoint {
  timestamp: string;
  score: number;
  smoothedScore: number;
  riskLevel: string;
}

export interface SiteRiskSummary {
  siteId: string;
  siteName: string;
  averageScore: number;
  maxScore: number;
  zoneCount: number;
  criticalZones: number;
  elevatedZones: number;
  lastUpdated: string;
}
