import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, ChevronLeft, ChevronRight, Clock3, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { availabilityApi, blockedPeriodsApi } from "../api/resources";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Dialog } from "../components/ui/Dialog";
import { Field, Input } from "../components/ui/Field";
import { useToast } from "../providers/ToastProvider";

function mondayNow() { const now = new Date(); const offset = now.getDay() === 0 ? -6 : 1 - now.getDay(); now.setDate(now.getDate() + offset); return now.toISOString().slice(0, 10); }
function shift(date: string, days: number) { const value = new Date(`${date}T00:00:00`); value.setDate(value.getDate() + days); return value.toISOString().slice(0, 10); }
function format(minutes: number) { return `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ""}`.trim(); }

const schema = z.object({ title: z.string().min(2), date: z.string().min(10), fullDay: z.boolean(), startTime: z.string().optional(), endTime: z.string().optional() }).refine((value) => value.fullDay || Boolean(value.startTime && value.endTime && value.startTime < value.endTime), { path: ["endTime"], message: "Choose a valid time range" });
type FormData = z.infer<typeof schema>;

export function FreeTimePage() {
  const [weekStart, setWeekStart] = useState(mondayNow);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const availability = useQuery({ queryKey: ["availability", weekStart], queryFn: () => availabilityApi.week(weekStart) });
  const periods = useQuery({ queryKey: ["blocked-periods", weekStart], queryFn: () => blockedPeriodsApi.list(weekStart) });
  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { title: "Personal day", date: weekStart, fullDay: true, startTime: "09:00", endTime: "17:00" } });
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ["availability", weekStart] }); void queryClient.invalidateQueries({ queryKey: ["blocked-periods", weekStart] }); };
  const create = useMutation({ mutationFn: (data: FormData) => blockedPeriodsApi.create(data), onSuccess: () => { setOpen(false); refresh(); toast("Blocked time saved"); }, onError: (error) => toast(error.message, "error") });
  const remove = useMutation({ mutationFn: blockedPeriodsApi.delete, onSuccess: () => { refresh(); toast("Blocked time removed"); }, onError: (error) => toast(error.message, "error") });
  const today = new Date().toISOString().slice(0, 10);
  const todayData = availability.data?.days.find((day) => day.date === today);

  return <div className="grid gap-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-3xl font-semibold">Free Time</h1><p className="mt-2 text-muted-foreground">Real availability between waking time and cutoff, after every commitment and blocked period.</p></div><Button onClick={() => { form.setValue("date", weekStart); setOpen(true); }}><Plus className="size-4" /> Block time</Button></div>
    <div className="flex items-center justify-between border-y border-border py-3"><Button variant="ghost" onClick={() => setWeekStart(shift(weekStart, -7))}><ChevronLeft className="size-4" /></Button><strong>Week of {weekStart}</strong><Button variant="ghost" onClick={() => setWeekStart(shift(weekStart, 7))}><ChevronRight className="size-4" /></Button></div>
    <div className="grid gap-4 md:grid-cols-3"><Card><p className="text-sm text-muted-foreground">Free today</p><p className="mt-2 text-3xl font-semibold">{format(todayData?.totalFreeMinutes ?? 0)}</p></Card><Card><p className="text-sm text-muted-foreground">Largest block today</p><p className="mt-2 text-3xl font-semibold">{format(todayData?.largestFreeBlockMinutes ?? 0)}</p></Card><Card><p className="text-sm text-muted-foreground">Free this week</p><p className="mt-2 text-3xl font-semibold">{format(availability.data?.totalFreeMinutes ?? 0)}</p></Card></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{availability.data?.days.map((day) => <section key={day.date} className="border-t-2 border-border pt-3"><div className="flex justify-between"><div><h2 className="font-semibold">{day.day.slice(0, 3)}</h2><p className="text-xs text-muted-foreground">{day.date}</p></div><span className="text-sm font-medium">{format(day.totalFreeMinutes)}</span></div><div className="mt-3 grid gap-2">{day.intervals.map((interval) => <div key={interval.startTime} className="flex items-center justify-between rounded-md bg-muted p-2 text-sm"><span className="flex items-center gap-2"><Clock3 className="size-4" />{interval.startTime}-{interval.endTime}</span><span className="text-xs text-muted-foreground">{format(interval.minutes)}</span></div>)}{!day.intervals.length ? <p className="py-3 text-sm text-muted-foreground">No free intervals</p> : null}</div></section>)}</div>
    {periods.data?.length ? <Card><h2 className="font-semibold">Blocked periods</h2><div className="mt-3 grid gap-2">{periods.data.map((period) => <div key={period.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm"><span className="flex items-center gap-2"><Ban className="size-4" />{period.title} · {period.date.slice(0, 10)} · {period.fullDay ? "All day" : `${period.startTime}-${period.endTime}`}</span><Button variant="ghost" onClick={() => remove.mutate(period.id)} aria-label="Delete blocked period"><Trash2 className="size-4 text-red-600" /></Button></div>)}</div></Card> : null}
    <Dialog open={open} title="Block schedule time" description="Generated work will never be placed inside this period." onClose={() => setOpen(false)}><form className="grid gap-4" onSubmit={form.handleSubmit((data) => create.mutate(data))}><Field label="Reason"><Input {...form.register("title")} /></Field><Field label="Date"><Input type="date" {...form.register("date")} /></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register("fullDay")} /> Block the full day</label>{!form.watch("fullDay") ? <div className="grid gap-4 sm:grid-cols-2"><Field label="Start"><Input type="time" {...form.register("startTime")} /></Field><Field label="End" error={form.formState.errors.endTime?.message}><Input type="time" {...form.register("endTime")} /></Field></div> : null}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={create.isPending}>Save blocked time</Button></div></form></Dialog>
  </div>;
}
