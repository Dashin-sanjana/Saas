import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";
import { subjectsApi } from "../api/resources";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Dialog } from "../components/ui/Dialog";
import { Field, Input } from "../components/ui/Field";
import { useToast } from "../providers/ToastProvider";
import type { Subject } from "../types/domain";

const schema = z.object({ name: z.string().min(2), code: z.string().optional(), revisionMinutes: z.coerce.number().min(5).max(480), colorKey: z.string().optional() });
type FormData = z.infer<typeof schema>;

export function SubjectsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: subjectsApi.list });
  const [editing, setEditing] = useState<Subject | null>(null);
  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { revisionMinutes: 60 } });
  const create = useMutation({
    mutationFn: subjectsApi.create,
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["subjects"] }); form.reset({ revisionMinutes: 60 }); toast("Subject saved"); },
    onError: (error) => toast(error.message, "error")
  });
  const remove = useMutation({
    mutationFn: subjectsApi.delete,
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["subjects"] }); toast("Subject deleted"); },
    onError: (error) => toast(error.message, "error")
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <h1 className="text-2xl font-semibold">Subjects</h1>
        <form className="mt-6 grid gap-4" onSubmit={form.handleSubmit((data) => create.mutate(data))}>
          <Field label="Subject name" error={form.formState.errors.name?.message}><Input {...form.register("name")} /></Field>
          <Field label="Code" error={form.formState.errors.code?.message}><Input {...form.register("code")} /></Field>
          <Field label="Default revision minutes" error={form.formState.errors.revisionMinutes?.message}><Input type="number" {...form.register("revisionMinutes")} /></Field>
          <Field label="Color key" error={form.formState.errors.colorKey?.message}><Input placeholder="teal" {...form.register("colorKey")} /></Field>
          <Button disabled={create.isPending}>Save subject</Button>
        </form>
      </Card>
      <Card>
        <h2 className="font-semibold">Your subjects</h2>
        <div className="mt-4 grid gap-3">
          {subjects.data?.length ? subjects.data.map((subject) => (
            <div key={subject.id} className="flex items-center justify-between rounded-md border border-border p-3">
              <div><p className="font-medium">{subject.name}</p><p className="text-sm text-muted-foreground">{subject.code ?? "No code"} · {subject.revisionMinutes} min revision</p></div>
              <div className="flex gap-2"><Button variant="secondary" onClick={() => setEditing(subject)}>Edit</Button><Button variant="danger" disabled={remove.isPending} onClick={() => window.confirm("Delete this subject?") && remove.mutate(subject.id)}>Delete</Button></div>
            </div>
          )) : <EmptyState title="No subjects yet" description="Add courses or learning areas that need recurring revision." />}
        </div>
      </Card>
      <EditSubjectDialog subject={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void queryClient.invalidateQueries({ queryKey: ["subjects"] }); }} />
    </div>
  );
}

function EditSubjectDialog({ subject, onClose, onSaved }: { subject: Subject | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const form = useForm<FormData>({ resolver: zodResolver(schema), values: subject ? { name: subject.name, code: subject.code ?? "", revisionMinutes: subject.revisionMinutes, colorKey: subject.colorKey ?? "" } : { name: "", code: "", revisionMinutes: 60, colorKey: "" } });
  const update = useMutation({ mutationFn: (data: FormData) => subjectsApi.update(subject!.id, data), onSuccess: () => { toast("Subject updated"); onSaved(); }, onError: (error) => toast(error.message, "error") });
  return <Dialog open={Boolean(subject)} title="Edit subject" onClose={onClose}><form className="grid gap-4" onSubmit={form.handleSubmit((data) => update.mutate(data))}>
    <Field label="Subject name"><Input {...form.register("name")} /></Field><Field label="Code"><Input {...form.register("code")} /></Field><Field label="Revision minutes"><Input type="number" {...form.register("revisionMinutes")} /></Field><Field label="Color key"><Input {...form.register("colorKey")} /></Field>
    <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={update.isPending}>{update.isPending ? "Saving..." : "Save changes"}</Button></div>
  </form></Dialog>;
}
