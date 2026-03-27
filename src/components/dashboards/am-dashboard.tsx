
import DevelopmentPlanWidget from "./development-plan-widget";
import ManagerDevelopmentMapWidget from "./manager-development-map-widget";
import AiInterventionLogWidget from "./ai-intervention-log-widget";
import TeamCoachingQualityWidget from "./team-coaching-quality-widget";
import ReadinessPipelineWidget from "./readiness-pipeline-widget";
import EscalationInsightsWidget from "./escalation-insights-widget";

export default function AmDashboard() {
  return (
    <div className="space-y-8">
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <ManagerDevelopmentMapWidget />
          <ReadinessPipelineWidget />
          <TeamCoachingQualityWidget />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <AiInterventionLogWidget />
          <EscalationInsightsWidget />
        </div>
      </div>

      <DevelopmentPlanWidget />
    </div>
  );
}
