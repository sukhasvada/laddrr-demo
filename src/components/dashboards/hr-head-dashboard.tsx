
import DevelopmentPlanWidget from "./development-plan-widget";
import LeadershipMaturityCurveWidget from "./leadership-maturity-curve-widget";
import EarlyWarningSystemWidget from "./early-warning-system-widget";
import ProgramImpactHeatmapWidget from "./program-impact-heatmap-widget";
import DiSentimentLensWidget from "./di-sentiment-lens-widget";
import AiCultureNarrativesWidget from "./ai-culture-narratives-widget";

export default function HRHeadDashboard() {
  return (
    <div className="space-y-8">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <LeadershipMaturityCurveWidget />
          <ProgramImpactHeatmapWidget />
        </div>
        <div className="space-y-6">
          <EarlyWarningSystemWidget />
          <DiSentimentLensWidget />
        </div>
      </div>
      
      <AiCultureNarrativesWidget />
      
    </div>
  );
}
