import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Field, Input } from "../components/ui/Field";
import { useAuth } from "../providers/AuthProvider";
import { useToast } from "../providers/ToastProvider";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (user) navigate("/app/dashboard");

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      navigate("/app/dashboard");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to login", "error");
    }
  };

  return (
    <Card>
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-sm text-muted-foreground">Sign in to continue planning your week.</p>
      <form className="mt-6 grid gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Email" error={errors.email?.message}><Input type="email" {...register("email")} /></Field>
        <Field label="Password" error={errors.password?.message}><Input type="password" {...register("password")} /></Field>
        <Button disabled={isSubmitting}>{isSubmitting ? "Signing in..." : "Login"}</Button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">No account? <Link className="text-primary" to="/register">Create one</Link></p>
    </Card>
  );
}
