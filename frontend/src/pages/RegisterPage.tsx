import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Field, Input } from "../components/ui/Field";
import { useAuth } from "../providers/AuthProvider";
import { useToast } from "../providers/ToastProvider";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  timezone: z.string().min(2)
});
type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
  });

  const onSubmit = async (data: FormData) => {
    try {
      await registerUser(data);
      navigate("/app/onboarding");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to register", "error");
    }
  };

  return (
    <Card>
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="mt-2 text-sm text-muted-foreground">Start with a clean scheduling foundation.</p>
      <form className="mt-6 grid gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Name" error={errors.name?.message}><Input {...register("name")} /></Field>
        <Field label="Email" error={errors.email?.message}><Input type="email" {...register("email")} /></Field>
        <Field label="Password" error={errors.password?.message}><Input type="password" {...register("password")} /></Field>
        <Field label="Timezone" error={errors.timezone?.message}><Input {...register("timezone")} /></Field>
        <Button disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Start Free"}</Button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">Already registered? <Link className="text-primary" to="/login">Login</Link></p>
    </Card>
  );
}
