import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { eventsApi, goalsApi, preferencesApi, subjectsApi, userApi } from "../api/resources";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Field, Input, Select } from "../components/ui/Field";
import { useAuth } from "../providers/AuthProvider";
import { useToast } from "../providers/ToastProvider";
import type { DayOfWeek, EventCategory, GoalFrequency, GoalType, Priority } from "../types/domain";

const days: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [preference, setPreference] = useState({ wakeTime: "07:00", sleepTime: "23:00", weekdayCutoffTime: "18:00", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  const [event, setEvent] = useState({ title: "", category: "LECTURE" as EventCategory, dayOfWeek: "MONDAY" as DayOfWeek, startTime: "09:00", endTime: "10:00", recurring: true, isLocked: true });
  const [subject, setSubject] = useState({ name: "", code: "", revisionMinutes: 60, colorKey: "" });
  const [goal, setGoal] = useState({ title: "", type: "STUDY" as GoalType, frequency: "WEEKLY" as GoalFrequency, durationMinutes: 60, priority: "MEDIUM" as Priority });
  const { setUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const complete = useMutation({
    mutationFn: async () => {
      await preferencesApi.update(preference);
      if (event.title.trim()) await eventsApi.create(event);
      if (subject.name.trim()) await subjectsApi.create(subject);
      if (goal.title.trim()) await goalsApi.create(goal);
      return userApi.update({ onboardingCompleted: true, timezone: preference.timezone });
    },
    onSuccess: (user) => { setUser(user); toast("Onboarding complete"); navigate("/app/dashboard"); },
    onError: (error) => toast(error.message, "error")
  });

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div><h1 className="text-3xl font-semibold">Onboarding</h1><p className="mt-2 text-muted-foreground">Step {step} of 6</p></div>
      <Card>
        {step === 1 && <div className="grid gap-4"><h2 className="text-xl font-semibold">Basic schedule preferences</h2><Field label="Wake time"><Input type="time" value={preference.wakeTime} onChange={(e) => setPreference({ ...preference, wakeTime: e.target.value })} /></Field><Field label="Sleep time"><Input type="time" value={preference.sleepTime} onChange={(e) => setPreference({ ...preference, sleepTime: e.target.value })} /></Field><Field label="Weekday cutoff"><Input type="time" value={preference.weekdayCutoffTime} onChange={(e) => setPreference({ ...preference, weekdayCutoffTime: e.target.value })} /></Field></div>}
        {step === 2 && <div className="grid gap-4"><h2 className="text-xl font-semibold">Fixed commitment</h2><Field label="Title"><Input value={event.title} onChange={(e) => setEvent({ ...event, title: e.target.value })} /></Field><Field label="Category"><Select value={event.category} onChange={(e) => setEvent({ ...event, category: e.target.value as EventCategory })}>{(["LECTURE", "WORK", "BUSINESS", "GYM", "MEETING", "PERSONAL", "OTHER"] as EventCategory[]).map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Day"><Select value={event.dayOfWeek} onChange={(e) => setEvent({ ...event, dayOfWeek: e.target.value as DayOfWeek })}>{days.map((x) => <option key={x}>{x}</option>)}</Select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Start"><Input type="time" value={event.startTime} onChange={(e) => setEvent({ ...event, startTime: e.target.value })} /></Field><Field label="End"><Input type="time" value={event.endTime} onChange={(e) => setEvent({ ...event, endTime: e.target.value })} /></Field></div></div>}
        {step === 3 && <div className="grid gap-4"><h2 className="text-xl font-semibold">Subject</h2><Field label="Name"><Input value={subject.name} onChange={(e) => setSubject({ ...subject, name: e.target.value })} /></Field><Field label="Code"><Input value={subject.code} onChange={(e) => setSubject({ ...subject, code: e.target.value })} /></Field><Field label="Default revision duration"><Input type="number" value={subject.revisionMinutes} onChange={(e) => setSubject({ ...subject, revisionMinutes: Number(e.target.value) })} /></Field></div>}
        {step === 4 && <div className="grid gap-4"><h2 className="text-xl font-semibold">Flexible goal</h2><Field label="Title"><Input value={goal.title} onChange={(e) => setGoal({ ...goal, title: e.target.value })} /></Field><Field label="Type"><Select value={goal.type} onChange={(e) => setGoal({ ...goal, type: e.target.value as GoalType })}>{(["STUDY", "RESEARCH", "BUSINESS", "WORK", "FITNESS", "PERSONAL", "OTHER"] as GoalType[]).map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Duration minutes"><Input type="number" value={goal.durationMinutes} onChange={(e) => setGoal({ ...goal, durationMinutes: Number(e.target.value) })} /></Field></div>}
        {step === 5 && <div className="grid gap-4"><h2 className="text-xl font-semibold">Summary</h2><pre className="overflow-auto rounded-md bg-muted p-4 text-xs">{JSON.stringify({ preference, event, subject, goal }, null, 2)}</pre></div>}
        {step === 6 && <div className="grid gap-4"><h2 className="text-xl font-semibold">Complete onboarding</h2><p className="text-muted-foreground">Your setup data will be saved to the backend and used across the dashboard and weekly view.</p></div>}
        <div className="mt-6 flex justify-between">
          <Button variant="secondary" disabled={step === 1} onClick={() => setStep((current) => current - 1)}>Back</Button>
          {step < 6 ? <Button onClick={() => setStep((current) => current + 1)}>Next</Button> : <Button disabled={complete.isPending} onClick={() => complete.mutate()}>{complete.isPending ? "Saving..." : "Complete"}</Button>}
        </div>
      </Card>
    </div>
  );
}
