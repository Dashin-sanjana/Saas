import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

const steps = ["Add real commitments", "Set priorities and goals", "Review your weekly plan"];
const benefits = ["One place for lectures, work, gym, research and personal life", "Built for realistic weeks, travel time and rest", "Ready for smart scheduling without forcing fake automation in Phase 1"];

export function LandingPage() {
  return (
    <div>
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6">
        <div className="font-semibold">Smart Scheduler</div>
        <div className="flex gap-2">
          <Link to="/login"><Button variant="ghost">Login</Button></Link>
          <Link to="/register"><Button>Start Free</Button></Link>
        </div>
      </header>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground">Productivity scheduling for real lives</p>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl">Plan your week around your real life.</h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">Manage lectures, work, gym, study, research and personal commitments in one place, then build toward realistic automatic schedules.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register"><Button>Start Free <ArrowRight className="h-4 w-4" /></Button></Link>
            <Link to="/login"><Button variant="secondary">View Demo</Button></Link>
          </div>
        </div>
        <Card className="grid gap-4 p-4">
          <div className="rounded-md bg-muted p-4">
            <p className="text-sm text-muted-foreground">Monday</p>
            {["Lecture 09:00", "Research 13:00", "Gym 18:30"].map((item) => <div key={item} className="mt-3 rounded-md border border-border bg-card p-3 text-sm">{item}</div>)}
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-md bg-teal-50 p-3 text-teal-800 dark:bg-teal-950 dark:text-teal-200">Subjects</div>
            <div className="rounded-md bg-indigo-50 p-3 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">Goals</div>
            <div className="rounded-md bg-rose-50 p-3 text-rose-800 dark:bg-rose-950 dark:text-rose-200">Events</div>
          </div>
        </Card>
      </section>
      <section className="border-y border-border bg-card/60 py-14">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 md:grid-cols-3">
          {steps.map((step, index) => <Card key={step}><p className="text-sm text-muted-foreground">0{index + 1}</p><h3 className="mt-3 font-semibold">{step}</h3></Card>)}
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-16 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold">Core benefits</h2>
          <div className="mt-6 grid gap-3">{benefits.map((benefit) => <div key={benefit} className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /><span>{benefit}</span></div>)}</div>
        </div>
        <Card>
          <Sparkles className="h-6 w-6 text-primary" />
          <h3 className="mt-4 text-xl font-semibold">Smart scheduling teaser</h3>
          <p className="mt-3 text-muted-foreground">The foundation is ready for an engine that understands fixed commitments, flexible work, subjects, rest and travel without pretending Phase 1 has solved it already.</p>
        </Card>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <Card className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div><h2 className="text-2xl font-semibold">For students, freelancers, founders and busy professionals.</h2><p className="mt-2 text-muted-foreground">Start with a clean scheduling system today.</p></div>
          <Link to="/register"><Button>Start Free</Button></Link>
        </Card>
      </section>
      <footer className="border-t border-border px-4 py-8 text-center text-sm text-muted-foreground">Smart Scheduler SaaS</footer>
    </div>
  );
}
