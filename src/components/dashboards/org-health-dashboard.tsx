import ParticipationMetricsWidget from "./org-health/participation-metrics-widget";
import RiskHeatmapWidget from "./org-health/risk-heatmap-widget";
import SentimentTrendWidget from "./org-health/sentiment-trend-widget";
import TopConcernsWidget from "./org-health/top-concerns-widget";

export default function OrgHealthDashboard() {
    return (
        <div className="space-y-6 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <SentimentTrendWidget />
                </div>
                <div>
                    <ParticipationMetricsWidget />
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RiskHeatmapWidget />
                <TopConcernsWidget />
            </div>
        </div>
    )
}