import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { AuthGuard } from "@/components/AuthGuard";
import { LandingShell } from "@/components/layout/LandingShell";
import { EngagementShell } from "@/components/layout/EngagementShell";
import { ObserverShell } from "@/components/layout/ObserverShell";
import { EngagementsLanding } from "@/pages/EngagementsLanding";
import { LoginPage } from "@/pages/LoginPage";
import { SetupDashboard } from "@/pages/SetupDashboard";
import { SetupStepStub } from "@/pages/SetupStepStub";
import { StepEngagementBasics } from "@/pages/steps/StepEngagementBasics";
import { StepCompetencies } from "@/pages/steps/StepCompetencies";
import { StepProficiencyTargets } from "@/pages/steps/StepProficiencyTargets";
import { StepTools } from "@/pages/steps/StepTools";
import { StepAggregationRules } from "@/pages/steps/StepAggregationRules";
import { StepAssessors } from "@/pages/steps/StepAssessors";
import { StepParticipants } from "@/pages/steps/StepParticipants";
import { StepSchedule } from "@/pages/steps/StepSchedule";
import { StepReportFormat } from "@/pages/steps/StepReportFormat";
import { LockReview } from "@/pages/LockReview";
import { SetupWizard } from "@/pages/SetupWizard";
import { ScoreLanding } from "@/pages/ScoreLanding";
import { ScoreCockpit } from "@/pages/ScoreCockpit";
import { ScoreParticipantSheet } from "@/pages/ScoreParticipantSheet";
import { CalibrateLanding } from "@/pages/CalibrateLanding";
import { CalibrateReconcile } from "@/pages/CalibrateReconcile";
import { CalibrateModerate } from "@/pages/CalibrateModerate";
import { CalibrateOar } from "@/pages/CalibrateOar";
import { ReportLanding } from "@/pages/ReportLanding";
import { ReportIndividual } from "@/pages/ReportIndividual";
import { ReportGroup } from "@/pages/ReportGroup";
import { ReportFeedback } from "@/pages/ReportFeedback";
import { ObserverHome } from "@/pages/observer/ObserverHome";
import { ObserverToolList } from "@/pages/observer/ObserverToolList";
import { ObserverCockpit } from "@/pages/observer/ObserverCockpit";
import { ObserverSheet } from "@/pages/observer/ObserverSheet";
import { ScoreObserverSummary } from "@/pages/ScoreObserverSummary";
import { ScoreCalibrationView } from "@/pages/ScoreCalibrationView";

function StepRouter() {
  const { stepKey } = useParams<{ stepKey: string }>();
  switch (stepKey) {
    case "engagement":   return <StepEngagementBasics />;
    case "competencies": return <StepCompetencies />;
    case "proficiency":  return <StepProficiencyTargets />;
    case "tools":        return <StepTools />;
    case "aggregation":  return <StepAggregationRules />;
    case "assessors":    return <StepAssessors />;
    case "participants": return <StepParticipants />;
    case "schedule":     return <StepSchedule />;
    case "report":       return <StepReportFormat />;
    default: return <SetupStepStub />;
  }
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public route — login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes — AuthGuard checks auth in prod mode */}
          <Route element={<AuthGuard />}>
            <Route element={<LandingShell />}>
              <Route index element={<EngagementsLanding />} />
            </Route>

            <Route path="/engagement/:engagementId" element={<EngagementShell />}>
              <Route index element={<Navigate to="setup" replace />} />
              <Route path="setup" element={<SetupDashboard />} />
              <Route path="setup/wizard" element={<SetupWizard />} />
              <Route path="setup/lock" element={<LockReview />} />
              <Route path="setup/:stepKey" element={<StepRouter />} />
              <Route path="score" element={<ScoreLanding />} />
              <Route path="score/:toolId" element={<ScoreCockpit />} />
              <Route path="score/:toolId/summary" element={<ScoreObserverSummary />} />
              <Route path="score/:toolId/calibrate" element={<ScoreCalibrationView />} />
              <Route path="score/:toolId/:participantId" element={<ScoreParticipantSheet />} />
              <Route path="calibrate" element={<CalibrateLanding />} />
              <Route path="calibrate/reconcile" element={<CalibrateReconcile />} />
              <Route path="calibrate/moderate" element={<CalibrateModerate />} />
              <Route path="calibrate/oar" element={<CalibrateOar />} />
              <Route path="report" element={<ReportLanding />} />
              <Route path="report/individual" element={<ReportIndividual />} />
              <Route path="report/group" element={<ReportGroup />} />
              <Route path="report/feedback" element={<ReportFeedback />} />
            </Route>

            {/* Observer routes */}
            <Route path="/observe" element={<ObserverHome />} />
            <Route path="/observe/:engagementId" element={<ObserverShell />}>
              <Route index element={<ObserverToolList />} />
              <Route path=":toolId" element={<ObserverCockpit />} />
              <Route path=":toolId/summary" element={<ScoreObserverSummary />} />
              <Route path=":toolId/calibrate" element={<ScoreCalibrationView />} />
              <Route path=":toolId/:participantId" element={<ObserverSheet />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
