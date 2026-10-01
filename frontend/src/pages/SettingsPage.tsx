import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { preferencesApi, userApi } from "../api/resources";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Field, Input } from "../components/ui/Field";
import { useAuth } from "../providers/AuthProvider";
import { useToast } from "../providers/ToastProvider";

const schema = z.object({
  name: z.string().min(2),
  timezone: z.string().min(2),
  wakeTime: z.string(),
  sleepTime: z.string(),
  weekdayCutoffTime: z.string(),
  defaultTravelMinutes: z.coerce.number().min(0),
  defaultRestMinutes: z.coerce.number().min(0)
  ,maxScheduledMinutesPerDay: z.coerce.number().min(30).max(1440)
  ,minimumBreakMinutes: z.coerce.number().min(5).max(120)
  ,breakAfterContinuousMinutes: z.coerce.number().min(30).max(480)
});
type FormData = z.infer<typeof schema>;

export function SettingsPage() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const preferences = useQuery({ queryKey: ["preferences"], queryFn: preferencesApi.get });
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    values: {
      name: user?.name ?? "",
      timezone: user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      wakeTime: preferences.data?.wakeTime ?? "07:00",
      sleepTime: preferences.data?.sleepTime ?? "23:00",
      weekdayCutoffTime: preferences.data?.weekdayCutoffTime ?? "18:00",
      defaultTravelMinutes: preferences.data?.defaultTravelMinutes ?? 15,
      defaultRestMinutes: preferences.data?.defaultRestMinutes ?? 10
      ,maxScheduledMinutesPerDay: preferences.data?.maxScheduledMinutesPerDay ?? 480
      ,minimumBreakMinutes: preferences.data?.minimumBreakMinutes ?? 15
      ,breakAfterContinuousMinutes: preferences.data?.breakAfterContinuousMinutes ?? 120
    }
  });
  const save = useMutation({
    mutationFn: async (data: FormData) => {
      const updatedUser = await userApi.update({ name: data.name, timezone: data.timezone });
      await preferencesApi.update(data);
      return updatedUser;
    },
    onSuccess: (updatedUser) => { setUser(updatedUser); toast("Settings saved"); },
    onError: (error) => toast(error.message, "error")
  });

  return (
    <Card className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <form className="mt-6 grid gap-4" onSubmit={form.handleSubmit((data) => save.mutate(data))}>
        <Field label="Name" error={form.formState.errors.name?.message}><Input {...form.register("name")} /></Field>
        <Field label="Timezone" error={form.formState.errors.timezone?.message}><Input {...form.register("timezone")} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Wake time"><Input type="time" {...form.register("wakeTime")} /></Field>
          <Field label="Sleep time"><Input type="time" {...form.register("sleepTime")} /></Field>
          <Field label="Weekday cutoff"><Input type="time" {...form.register("weekdayCutoffTime")} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Default travel minutes"><Input type="number" {...form.register("defaultTravelMinutes")} /></Field>
          <Field label="Default rest minutes"><Input type="number" {...form.register("defaultRestMinutes")} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Max flexible minutes/day"><Input type="number" {...form.register("maxScheduledMinutesPerDay")} /></Field>
          <Field label="Break minutes"><Input type="number" {...form.register("minimumBreakMinutes")} /></Field>
          <Field label="Break after minutes"><Input type="number" {...form.register("breakAfterContinuousMinutes")} /></Field>
        </div>
        <Button disabled={save.isPending}>Save settings</Button>
      </form>
    </Card>
  );
}
