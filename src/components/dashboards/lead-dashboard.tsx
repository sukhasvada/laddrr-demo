
import DevelopmentPlanWidget from "./development-plan-widget";
import QualityScoreTrendWidget from "./quality-score-trend-widget";
import ActionItemHeatmapWidget from "./action-item-heatmap-widget";
import MissedSignalAlertsWidget from "./missed-signal-alerts-widget";
import CoachingOpportunitiesWidget from "./coaching-opportunities-widget";
import NetsLeaderboardWidget from "./nets-leaderboard-widget";
import TeamGrowthHighlightsWidget from "./team-growth-highlights-widget";

export default function LeadDashboard() {
  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <QualityScoreTrendWidget />
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ActionItemHeatmapWidget />
            <TeamGrowthHighlightsWidget />
          </div>
           <NetsLeaderboardWidget />
        </div>
        <div className="space-y-4">
          <MissedSignalAlertsWidget />
          <CoachingOpportunitiesWidget />
        </div>
      </div>
      
      <DevelopmentPlanWidget />

    </div>
  );
}
