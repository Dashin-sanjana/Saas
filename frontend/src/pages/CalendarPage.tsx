import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";
import { eventsApi, subjectsApi } from "../api/resources";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Dialog } from "../components/ui/Dialog";
import { Field, Input, Select, Textarea } from "../components/ui/Field";
import { useToast } from "../providers/ToastProvider";
import type { DayOfWeek, EventCategory, EventItem, Subject } from "../types/domain";

const schema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  category: z.enum(["LECTURE", "WORK", "BUSINESS", "GYM", "TRAVEL", "REST", "PERSONAL", "MEETING", "OTHER"]),
  dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  location: z.string().optional(),
  recurring: z.boolean(),
  isLocked: z.boolean(),
  subjectId: z.string().optional().transform((value) => value || null),
  eventDate: z.string().optional().transform((value) => value || null)
}).refine((value) => value.recurring || Boolean(value.eventDate), { path: ["eventDate"], message: "Choose a date for a one-time event" });

type FormData = z.infer<typeof schema>;

export function CalendarPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const events = useQuery({ queryKey: ["events"], queryFn: eventsApi.list });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: subjectsApi.list });
  const [editing, setEditing] = useState<EventItem | null>(null);
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: "LECTURE", dayOfWeek: "MONDAY", startTime: "09:00", endTime: "10:00", recurring: true, isLocked: true }
  });
  const create = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["events"] }); form.reset({ category: "LECTURE", dayOfWeek: "MONDAY", startTime: "09:00", endTime: "10:00", recurring: true, isLocked: true }); toast("Event saved"); },
    onError: (error) => toast(error.message, "error")
  });
  const remove = useMutation({
    mutationFn: eventsApi.delete,
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["events"] }); toast("Event deleted"); },
    onError: (error) => toast(error.message, "error")
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <h1 className="text-2xl font-semibold">Fixed commitments</h1>
        <p className="mt-2 text-sm text-muted-foreground">Add lectures, work, gym, meetings and personal events that repeat weekly.</p>
        <form className="mt-6 grid gap-4" onSubmit={form.handleSubmit((data) => create.mutate(data))}>
          <Field label="Title" error={form.formState.errors.title?.message}><Input {...form.register("title")} /></Field>
          <Field label="Description"><Textarea {...form.register("description")} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category"><Select {...form.register("category")}>{(["LECTURE", "WORK", "BUSINESS", "GYM", "TRAVEL", "REST", "PERSONAL", "MEETING", "OTHER"] as EventCategory[]).map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <Field label="Day"><Select {...form.register("dayOfWeek")}>{(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as DayOfWeek[]).map((x) => <option key={x}>{x}</option>)}</Select></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start time"><Input type="time" {...form.register("startTime")} /></Field>
            <Field label="End time"><Input type="time" {...form.register("endTime")} /></Field>
          </div>
          <Field label="Location"><Input {...form.register("location")} /></Field>
          <Field label="Subject for revision"><Select {...form.register("subjectId")}><option value="">No subject</option>{subjects.data?.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</Select></Field>
          {!form.watch("recurring") ? <Field label="Event date" error={form.formState.errors.eventDate?.message}><Input type="date" {...form.register("eventDate")} /></Field> : null}
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" {...form.register("recurring")} /> Recurring</label>
            <label className="flex items-center gap-2"><input type="checkbox" {...form.register("isLocked")} /> Locked</label>
          </div>
          <Button disabled={create.isPending}>Save event</Button>
        </form>
      </Card>
      <Card>
        <h2 className="font-semibold">Your commitments</h2>
        <div className="mt-4 grid gap-3">
          {events.data?.length ? events.data.map((event) => (
            <div key={event.id} className="flex items-center justify-between rounded-md border border-border p-3">
              <div><p className="font-medium">{event.title}</p><p className="text-sm text-muted-foreground">{event.dayOfWeek} · {event.startTime}-{event.endTime} · {event.category}</p></div>
              <div className="flex gap-2"><Button variant="secondary" onClick={() => setEditing(event)}>Edit</Button><Button variant="danger" disabled={remove.isPending} onClick={() => window.confirm("Delete this event?") && remove.mutate(event.id)}>Delete</Button></div>
            </div>
          )) : <EmptyState title="No commitments yet" description="Add your real fixed events to anchor the weekly schedule." />}
        </div>
      </Card>
      <EditEventDialog event={editing} subjects={subjects.data ?? []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void queryClient.invalidateQueries({ queryKey: ["events"] }); }} />
    </div>
  );
}

function EditEventDialog({ event, subjects, onClose, onSaved }: { event: EventItem | null; subjects: Subject[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const form = useForm<FormData>({ resolver: zodResolver(schema), values: event ? { title: event.title, description: event.description ?? "", category: event.category, dayOfWeek: event.dayOfWeek, startTime: event.startTime, endTime: event.endTime, location: event.location ?? "", recurring: event.recurring, isLocked: event.isLocked, subjectId: event.subjectId ?? "", eventDate: event.eventDate?.slice(0, 10) ?? "" } : { title: "", description: "", category: "OTHER", dayOfWeek: "MONDAY", startTime: "09:00", endTime: "10:00", location: "", recurring: true, isLocked: true, subjectId: "", eventDate: "" } });
  const update = useMutation({ mutationFn: (data: FormData) => eventsApi.update(event!.id, data), onSuccess: () => { toast("Event updated"); onSaved(); }, onError: (error) => toast(error.message, "error") });
  return <Dialog open={Boolean(event)} title="Edit event" onClose={onClose}><form className="grid gap-4" onSubmit={form.handleSubmit((data) => update.mutate(data))}>
    <Field label="Title"><Input {...form.register("title")} /></Field><Field label="Description"><Textarea {...form.register("description")} /></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Category"><Select {...form.register("category")}>{(["LECTURE", "WORK", "BUSINESS", "GYM", "TRAVEL", "REST", "PERSONAL", "MEETING", "OTHER"] as EventCategory[]).map((value) => <option key={value}>{value}</option>)}</Select></Field><Field label="Day"><Select {...form.register("dayOfWeek")}>{(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as DayOfWeek[]).map((value) => <option key={value}>{value}</option>)}</Select></Field></div>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Start"><Input type="time" {...form.register("startTime")} /></Field><Field label="End"><Input type="time" {...form.register("endTime")} /></Field></div>
    <Field label="Location"><Input {...form.register("location")} /></Field><Field label="Subject for revision"><Select {...form.register("subjectId")}><option value="">No subject</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</Select></Field>{!form.watch("recurring") ? <Field label="Event date"><Input type="date" {...form.register("eventDate")} /></Field> : null}
    <div className="flex gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" {...form.register("recurring")} /> Recurring</label><label className="flex items-center gap-2"><input type="checkbox" {...form.register("isLocked")} /> Locked</label></div>
    {event?.recurring ? <ExceptionEditor eventId={event.id} /> : null}
    <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={update.isPending}>{update.isPending ? "Saving..." : "Save changes"}</Button></div>
  </form></Dialog>;
}

const exceptionSchema = z.object({ date: z.string().min(10), type: z.enum(["CANCELLED", "OVERRIDDEN"]), replacementStartTime: z.string().optional(), replacementEndTime: z.string().optional(), replacementTitle: z.string().optional() });
type ExceptionForm = z.infer<typeof exceptionSchema>;

function ExceptionEditor({ eventId }: { eventId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const exceptions = useQuery({ queryKey: ["event-exceptions", eventId], queryFn: () => eventsApi.exceptions(eventId) });
  const form = useForm<ExceptionForm>({ resolver: zodResolver(exceptionSchema), defaultValues: { date: "", type: "CANCELLED", replacementStartTime: "09:00", replacementEndTime: "10:00", replacementTitle: "" } });
  const type = form.watch("type");
  const create = useMutation({ mutationFn: (data: ExceptionForm) => eventsApi.createException(eventId, data), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["event-exceptions", eventId] }); toast("Exception saved"); }, onError: (error) => toast(error.message, "error") });
  const remove = useMutation({ mutationFn: (id: string) => eventsApi.deleteException(eventId, id), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["event-exceptions", eventId] }), onError: (error) => toast(error.message, "error") });
  return <div className="border-t border-border pt-4"><h3 className="font-medium">Recurrence exceptions</h3><div className="mt-3 grid gap-3"><div className="grid gap-3 sm:grid-cols-2"><Field label="Date"><Input type="date" {...form.register("date")} /></Field><Field label="Action"><Select {...form.register("type")}><option value="CANCELLED">Cancel occurrence</option><option value="OVERRIDDEN">Override occurrence</option></Select></Field></div>{type === "OVERRIDDEN" ? <><Field label="Replacement title"><Input {...form.register("replacementTitle")} /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Replacement start"><Input type="time" {...form.register("replacementStartTime")} /></Field><Field label="Replacement end"><Input type="time" {...form.register("replacementEndTime")} /></Field></div></> : null}<Button type="button" variant="secondary" onClick={form.handleSubmit((data) => create.mutate(data))}>Add exception</Button>{exceptions.data?.map((exception) => <div key={exception.id} className="flex items-center justify-between rounded-md bg-muted p-2 text-xs"><span>{exception.date.slice(0, 10)} · {exception.type}</span><button type="button" className="text-red-600" onClick={() => remove.mutate(exception.id)}>Remove</button></div>)}</div></div>;
}
