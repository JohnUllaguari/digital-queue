import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Stethoscope, User, IdCard, AlertCircle, CheckCircle2, Loader2, Activity } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Registro de Atención | Sistema Hospitalario" },
      { name: "description", content: "Turnero digital para registro rápido de pacientes en sala de emergencias." },
    ],
  }),
});

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function Index() {
  const now = useClock();
  const [form, setForm] = useState({ nombre: "", cedula: "", motivo: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [turno, setTurno] = useState<string | null>(null);

  const time = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || !form.cedula || !form.motivo) return;
    setStatus("loading");
    try {
      // TODO: replace with your webhook URL
      const WEBHOOK_URL = "";
      if (WEBHOOK_URL) {
        await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, timestamp: new Date().toISOString() }),
        });
      } else {
        await new Promise((r) => setTimeout(r, 700));
      }
      const code = "A-" + String(Math.floor(Math.random() * 900) + 100);
      setTurno(code);
      setStatus("success");
      setForm({ nombre: "", cedula: "", motivo: "" });
      setTimeout(() => setStatus("idle"), 4000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: "var(--gradient-bg)" }}
    >
      <div className="w-full max-w-xl">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6 px-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" style={{ color: "var(--hospital-blue)" }} />
            <span className="font-medium tracking-wide">Sistema Hospitalario</span>
          </div>
          <div className="flex items-center gap-3 tabular-nums">
            <span className="capitalize hidden sm:inline">{date}</span>
            <span
              className="font-semibold px-2.5 py-1 rounded-md"
              style={{ background: "var(--hospital-blue-soft)", color: "var(--hospital-blue)" }}
            >
              {time}
            </span>
          </div>
        </div>

        {/* Card */}
        <section
          className="bg-card rounded-2xl p-8 sm:p-10"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <header className="flex flex-col items-center text-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "var(--hospital-blue-soft)", color: "var(--hospital-blue)" }}
            >
              <Stethoscope className="w-7 h-7" strokeWidth={2} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Registro de Atención
            </h1>
            <p className="mt-2 text-base text-muted-foreground">Ingrese los datos del paciente</p>
          </header>

          {status === "success" && turno ? (
            <div
              className="rounded-xl p-6 text-center transition-all"
              style={{ background: "var(--hospital-blue-soft)" }}
            >
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--hospital-green)" }} />
              <p className="text-sm text-muted-foreground">Su turno ha sido generado</p>
              <p className="text-5xl font-bold tracking-tight mt-2" style={{ color: "var(--hospital-blue)" }}>
                {turno}
              </p>
              <p className="text-sm text-muted-foreground mt-3">Por favor espere a ser llamado</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <Field
                icon={<User className="w-4 h-4" />}
                label="Nombre del paciente"
                placeholder="Ej. María González"
                value={form.nombre}
                onChange={(v) => setForm({ ...form, nombre: v })}
              />
              <Field
                icon={<IdCard className="w-4 h-4" />}
                label="Cédula o identificación"
                placeholder="Ej. 0102030405"
                value={form.cedula}
                onChange={(v) => setForm({ ...form, cedula: v })}
                inputMode="numeric"
              />
              <Field
                icon={<AlertCircle className="w-4 h-4" />}
                label="Motivo de emergencia"
                placeholder="Describa brevemente el motivo"
                value={form.motivo}
                onChange={(v) => setForm({ ...form, motivo: v })}
                textarea
              />

              {status === "error" && (
                <p className="text-sm text-center" style={{ color: "var(--hospital-red)" }}>
                  Ocurrió un error. Intente nuevamente.
                </p>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full h-14 rounded-xl text-base font-semibold text-white transition-all duration-200 hover:opacity-95 active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2"
                style={{
                  background: "var(--hospital-blue)",
                  boxShadow: "0 8px 20px -8px var(--hospital-blue)",
                }}
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generando turno...
                  </>
                ) : (
                  "Generar Turno"
                )}
              </button>
            </form>
          )}
        </section>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Atención 24/7 · Sus datos son tratados con confidencialidad
        </p>
      </div>
    </main>
  );
}

function Field({
  icon,
  label,
  placeholder,
  value,
  onChange,
  textarea,
  inputMode,
}: {
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  inputMode?: "numeric" | "text";
}) {
  const base =
    "w-full rounded-xl border border-border bg-background px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground/70 outline-none transition-all focus:border-transparent focus:ring-4 focus:ring-[color:var(--hospital-blue-soft)] focus:shadow-[0_0_0_1px_var(--hospital-blue)]";
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
        <span style={{ color: "var(--hospital-blue)" }}>{icon}</span>
        {label}
      </span>
      {textarea ? (
        <textarea
          required
          rows={3}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={base + " resize-none"}
        />
      ) : (
        <input
          required
          type="text"
          inputMode={inputMode}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      )}
    </label>
  );
}
