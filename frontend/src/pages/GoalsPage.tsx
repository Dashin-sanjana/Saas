import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";
import { goalsApi } from "../api/resources";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Dialog } from "../components/ui/Dialog";
import { Field, Input, Select, Textarea } from "../components/ui/Field";
import { useToast } from "../providers/ToastProvider";
import type { DayOfWeek, Goal, GoalFrequency, GoalType, Priority } from "../types/domain";

const schema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  type: z.enum(["STUDY", "RESEARCH", "BUSINESS", "WORK", "FITNESS", "PERSONAL", "OTHER"]),
  frequency: z.enum(["DAILY", "WEEKDAYS", "WEEKENDS", "WEEKLY"]),
  durationMinutes: z.coerce.number().min(5).max(1440),
  weekdayDurationMinutes: z.coerce.number().min(5).max(1440).optional().or(z.literal("").transform(() => undefined)),
  weekendDurationMinutes: z.coerce.number().min(5).max(1440).optional().or(z.literal("").transform(() => undefined)),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  preferredDays: z.array(z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"])),
  allowedDays: z.array(z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"])),
  preferredStartTime: z.string().transform((value) => value || null), preferredEndTime: z.string().transform((value) => value || null), earliestStartTime: z.string().transform((value) => value || null), latestEndTime: z.string().transform((value) => value || null),
  allowSplit: z.boolean(), minimumBlockMinutes: z.coerce.number().min(5).max(1440), maximumBlockMinutes: z.coerce.number().min(5).max(1440).optional().or(z.literal("").transform(() => null))
});
type FormData = z.infer<typeof schema>;

export function GoalsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const goals = useQuery({ queryKey: ["goals"], queryFn: goalsApi.list });
  const [editing, setEditing] = useState<Goal | null>(null);
  const defaults: FormData = { title: "", description: "", type: "STUDY", frequency: "WEEKLY", durationMinutes: 60, priority: "MEDIUM", preferredDays: [], allowedDays: [], preferredStartTime: "", preferredEndTime: "", earliestStartTime: "", latestEndTime: "", allowSplit: true, minimumBlockMinutes: 30 };
  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: defaults });
  const create = useMutation({
    mutationFn: goalsApi.create,
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["goals"] }); form.reset(defaults); toast("Goal saved"); },
    onError: (error) => toast(error.message, "error")
  });
  const remove = useMutation({
    mutationFn: goalsApi.delete,
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["goals"] }); toast("Goal deleted"); },
    onError: (error) => toast(error.message, "error")
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <h1 className="text-2xl font-semibold">Goals</h1>
        <form className="mt-6 grid gap-4" onSubmit={form.handleSubmit((data) => create.mutate(data))}>
          <Field label="Goal title" error={form.formState.errors.title?.message}><Input {...form.register("title")} /></Field>
          <Field label="Description" error={form.formState.errors.description?.message}><Textarea {...form.register("description")} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type"><Select {...form.register("type")}>{(["STUDY", "RESEARCH", "BUSINESS", "WORK", "FITNESS", "PERSONAL", "OTHER"] as GoalType[]).map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <Field label="Frequency"><Select {...form.register("frequency")}>{(["DAILY", "WEEKDAYS", "WEEKENDS", "WEEKLY"] as GoalFrequency[]).map((x) => <option key={x}>{x}</option>)}</Select></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Minutes"><Input type="number" {...form.register("durationMinutes")} /></Field>
            <Field label="Weekday mins"><Input type="number" {...form.register("weekdayDurationMinutes")} /></Field>
            <Field label="Weekend mins"><Input type="number" {...form.register("weekendDurationMinutes")} /></Field>
          </div>
          <Field label="Priority"><Select {...form.register("priority")}>{(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as Priority[]).map((x) => <option key={x}>{x}</option>)}</Select></Field>
          <DayChecks label="Preferred days" field="preferredDays" register={form.register} />
          <DayChecks label="Allowed days (empty means any)" field="allowedDays" register={form.register} />
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Preferred start"><Input type="time" {...form.register("preferredStartTime")} /></Field><Field label="Preferred end"><Input type="time" {...form.register("preferredEndTime")} /></Field><Field label="Earliest start"><Input type="time" {...form.register("earliestStartTime")} /></Field><Field label="Latest end"><Input type="time" {...form.register("latestEndTime")} /></Field></div>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Minimum block minutes"><Input type="number" {...form.register("minimumBlockMinutes")} /></Field><Field label="Maximum block minutes"><Input type="number" {...form.register("maximumBlockMinutes")} /></Field></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register("allowSplit")} /> Allow this goal to split</label>
          <Button disabled={create.isPending}>Save goal</Button>
        </form>
      </Card>
      <Card>
        <h2 className="font-semibold">Active goals</h2>
        <div className="mt-4 grid gap-3">
          {goals.data?.length ? goals.data.map((goal) => (
            <div key={goal.id} className="flex items-center justify-between rounded-md border border-border p-3">
              <div><p className="font-medium">{goal.title}</p><p className="text-sm text-muted-foreground">{goal.type} · {goal.frequency} · {goal.durationMinutes} min</p></div>
              <div className="flex gap-2"><Button variant="secondary" onClick={() => setEditing(goal)}>Edit</Button><Button variant="danger" disabled={remove.isPending} onClick={() => window.confirm("Delete this goal?") && remove.mutate(goal.id)}>Delete</Button></div>
            </div>
          )) : <EmptyState title="No goals yet" description="Add flexible work such as research, business, fitness or study blocks." />}
        </div>
      </Card>
      <EditGoalDialog goal={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void queryClient.invalidateQueries({ queryKey: ["goals"] }); }} />
    </div>
  );
}

function EditGoalDialog({ goal, onClose, onSaved }: { goal: Goal | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const form = useForm<FormData>({ resolver: zodResolver(schema), values: goal ? { title: goal.title, description: goal.description ?? "", type: goal.type, frequency: goal.frequency, durationMinutes: goal.durationMinutes, weekdayDurationMinutes: goal.weekdayDurationMinutes, weekendDurationMinutes: goal.weekendDurationMinutes, priority: goal.priority, preferredDays: goal.preferredDays ?? [], allowedDays: goal.allowedDays ?? [], preferredStartTime: goal.preferredStartTime ?? "", preferredEndTime: goal.preferredEndTime ?? "", earliestStartTime: goal.earliestStartTime ?? "", latestEndTime: goal.latestEndTime ?? "", allowSplit: goal.allowSplit ?? true, minimumBlockMinutes: goal.minimumBlockMinutes ?? 30, maximumBlockMinutes: goal.maximumBlockMinutes ?? undefined } : { title: "", description: "", type: "STUDY", frequency: "WEEKLY", durationMinutes: 60, priority: "MEDIUM", preferredDays: [], allowedDays: [], preferredStartTime: "", preferredEndTime: "", earliestStartTime: "", latestEndTime: "", allowSplit: true, minimumBlockMinutes: 30 } });
  const update = useMutation({ mutationFn: (data: FormData) => goalsApi.update(goal!.id, data), onSuccess: () => { toast("Goal updated"); onSaved(); }, onError: (error) => toast(error.message, "error") });
  return <Dialog open={Boolean(goal)} title="Edit goal" onClose={onClose}><form className="grid gap-4" onSubmit={form.handleSubmit((data) => update.mutate(data))}>
    <Field label="Title"><Input {...form.register("title")} /></Field><Field label="Description"><Textarea {...form.register("description")} /></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Type"><Select {...form.register("type")}>{(["STUDY", "RESEARCH", "BUSINESS", "WORK", "FITNESS", "PERSONAL", "OTHER"] as GoalType[]).map((value) => <option key={value}>{value}</option>)}</Select></Field><Field label="Frequency"><Select {...form.register("frequency")}>{(["DAILY", "WEEKDAYS", "WEEKENDS", "WEEKLY"] as GoalFrequency[]).map((value) => <option key={value}>{value}</option>)}</Select></Field></div>
    <div className="grid gap-4 sm:grid-cols-3"><Field label="Minutes"><Input type="number" {...form.register("durationMinutes")} /></Field><Field label="Weekday mins"><Input type="number" {...form.register("weekdayDurationMinutes")} /></Field><Field label="Weekend mins"><Input type="number" {...form.register("weekendDurationMinutes")} /></Field></div>
    <Field label="Priority"><Select {...form.register("priority")}>{(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as Priority[]).map((value) => <option key={value}>{value}</option>)}</Select></Field>
    <DayChecks label="Preferred days" field="preferredDays" register={form.register} /><DayChecks label="Allowed days" field="allowedDays" register={form.register} />
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Preferred start"><Input type="time" {...form.register("preferredStartTime")} /></Field><Field label="Preferred end"><Input type="time" {...form.register("preferredEndTime")} /></Field><Field label="Earliest start"><Input type="time" {...form.register("earliestStartTime")} /></Field><Field label="Latest end"><Input type="time" {...form.register("latestEndTime")} /></Field></div>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Minimum block"><Input type="number" {...form.register("minimumBlockMinutes")} /></Field><Field label="Maximum block"><Input type="number" {...form.register("maximumBlockMinutes")} /></Field></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register("allowSplit")} /> Allow split</label>
    <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={update.isPending}>{update.isPending ? "Saving..." : "Save changes"}</Button></div>
  </form></Dialog>;
}

function DayChecks({ label, field, register }: { label: string; field: "preferredDays" | "allowedDays"; register: ReturnType<typeof useForm<FormData>>["register"] }) {
  const dayValues: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
  return <fieldset><legend className="text-sm font-medium">{label}</legend><div className="mt-2 flex flex-wrap gap-2">{dayValues.map((day) => <label key={day} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs"><input type="checkbox" value={day} {...register(field)} />{day.slice(0, 3)}</label>)}</div></fieldset>;
}
