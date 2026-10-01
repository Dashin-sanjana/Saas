import { useQuery } from "@tanstack/react-query";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { dashboardApi } from "../api/resources";

export function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: dashboardApi.get });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading dashboard...</p>;
  if (!data) return null;
  const formatMinutes = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ""}`.trim();
  const todayItems = [...data.todaysEvents.map((item) => ({ ...item, kind: "FIXED" })), ...data.todaysBlocks.map((item) => ({ ...item, kind: item.sourceType }))].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Your current scheduling foundation, powered by your own data.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><p className="text-sm text-muted-foreground">Scheduled Today</p><p className="mt-3 text-3xl font-semibold">{formatMinutes(data.metrics.scheduledMinutesToday)}</p></Card>
        <Card><p className="text-sm text-muted-foreground">Free Time Today</p><p className="mt-3 text-3xl font-semibold">{formatMinutes(data.metrics.freeMinutesToday)}</p></Card>
        <Card><p className="text-sm text-muted-foreground">Active Goals</p><p className="mt-3 text-3xl font-semibold">{data.activeGoals.length}</p></Card>
        <Card><p className="text-sm text-muted-foreground">Weekly Load</p><p className="mt-3 text-3xl font-semibold">{formatMinutes(data.metrics.weeklyScheduledMinutes)}</p></Card>
        <Card><p className="text-sm text-muted-foreground">Completion</p><p className="mt-3 text-3xl font-semibold">{data.metrics.completionPercentage}%</p><p className="mt-1 text-xs text-muted-foreground">{formatMinutes(data.metrics.completedMinutes)} of {formatMinutes(data.metrics.scheduledProductiveMinutes)}</p></Card>
        <Card><p className="text-sm text-muted-foreground">Next Event</p><p className="mt-3 text-sm font-medium">{data.metrics.nextEvent ? `${data.metrics.nextEvent.date} · ${data.metrics.nextEvent.startTime} · ${data.metrics.nextEvent.title}` : "No upcoming event"}</p></Card>
        <Card><p className="text-sm text-muted-foreground">Next Generated Task</p><p className="mt-3 text-sm font-medium">{data.metrics.nextGeneratedTask ? `${data.metrics.nextGeneratedTask.date.slice(0, 10)} · ${data.metrics.nextGeneratedTask.startTime} · ${data.metrics.nextGeneratedTask.title}` : "No upcoming task"}</p></Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <h2 className="text-lg font-semibold">Today's Schedule</h2>
          <div className="mt-4 grid gap-3">
            {todayItems.length ? todayItems.map((item) => (
              <div key={`${item.kind}:${item.id}`} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3"><strong>{item.title}</strong><Badge>{item.kind}</Badge></div>
                <p className="mt-1 text-sm text-muted-foreground">{item.startTime} - {item.endTime}</p>
              </div>
            )) : <EmptyState title="No events today" description="Add fixed commitments to see them here." />}
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Upcoming Events</h2>
          <div className="mt-4 grid gap-3">
            {data.upcomingEvents.map((event) => <div key={event.id} className="flex justify-between rounded-md bg-muted p-3 text-sm"><span>{event.title}</span><span>{event.dayOfWeek}</span></div>)}
          </div>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card><h2 className="font-semibold">Active Goals</h2><div className="mt-4 grid gap-2">{data.activeGoals.map((goal) => <Badge key={goal.id}>{goal.title}</Badge>)}</div></Card>
        <Card><h2 className="font-semibold">Subjects</h2><div className="mt-4 grid gap-2">{data.subjects.map((subject) => <Badge key={subject.id}>{subject.name}</Badge>)}</div></Card>
        <Card><h2 className="font-semibold">Weekly Schedule</h2><p className="mt-4 text-sm text-muted-foreground">{data.scheduleBlocks.length ? `${data.scheduleBlocks.length} flexible and manual blocks are committed this week.` : "No generated schedule has been accepted for this week."}</p></Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><h2 className="font-semibold">Goal Progress</h2><div className="mt-4 grid gap-4">{data.goalProgress.map((goal) => <div key={goal.goalId}><div className="flex justify-between text-sm"><span>{goal.title}</span><span>{goal.percentage}%</span></div><div className="mt-2 h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-primary" style={{ width: `${goal.percentage}%` }} /></div><p className="mt-1 text-xs text-muted-foreground">{formatMinutes(goal.completedMinutes)} completed of {formatMinutes(goal.scheduledMinutes)}</p></div>)}</div></Card>
        <Card><h2 className="font-semibold">Needs Attention</h2><div className="mt-4 grid gap-3 text-sm">{data.unfinishedBlocks.map((block) => <div key={block.id} className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-950">Unfinished: {block.title} · {block.date.slice(0, 10)}</div>)}{data.overloadedDays.map((day) => <div key={day.date} className="rounded-md border border-red-300 bg-red-50 p-3 text-red-950">{day.day} has {formatMinutes(day.minutes)} against a {formatMinutes(day.limit)} limit.</div>)}{!data.unfinishedBlocks.length && !data.overloadedDays.length ? <p className="text-muted-foreground">No unfinished work or overloaded days.</p> : null}</div></Card>
      </div>
    </div>
  );
}
