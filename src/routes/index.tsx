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
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "no-procede">("idle");
  const [responseData, setResponseData] = useState<unknown | null>(null);
  const [errors, setErrors] = useState<{ cedula?: string }>({});
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const isLoading = status === "loading";

  const time = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const validate = () => {
    const newErrors: { cedula?: string } = {};
    if (!/^\d{10}$/.test(form.cedula)) {
      newErrors.cedula = "La cédula debe tener exactamente 10 dígitos numéricos.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isNoProcedeResponse = (payload: unknown) => {
    if (typeof payload === "string") {
      return payload.toUpperCase().includes("NO PROCEDE");
    }
    if (payload && typeof payload === "object") {
      const text = JSON.stringify(payload).toUpperCase();
      return text.includes("NO PROCEDE");
    }
    return false;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || !form.cedula || !form.motivo) return;
    if (!validate()) return;
    setStatus("loading");
    setWebhookError(null);
    try {
      // Test webhook (keep commented for future tests): http://localhost:5678/webhook-test/registro-turno
      const resp = await fetch("http://localhost:5678/webhook/registro-turno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.toLowerCase(),
          cedula: form.cedula,
          motivo: form.motivo.toLowerCase(),
        }),
      });
      const data = await resp.json().catch(() => null);

      if (isNoProcedeResponse(data)) {
        setResponseData(data);
        setStatus("no-procede");
        return;
      }

      if (!resp.ok || !data || !data.ok) {
        throw new Error((data && (data.error || data.details)) || "Error al enviar la solicitud");
      }

      setResponseData(data.data ?? null);
      setStatus("success");
      setForm({ nombre: "", cedula: "", motivo: "" });
      setErrors({});
    } catch (error) {
      setStatus("error");
      setWebhookError(error instanceof Error ? error.message : "Ocurrió un error al enviar el formulario.");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const downloadPDF = async () => {
    if (!responseData) return;
    const { jsPDF } = await import("jspdf");
    const QRCode: any = (await import("qrcode")).default;

    const dataString = JSON.stringify(responseData, null, 2);
    const qrDataUrl = await QRCode.toDataURL(dataString, { margin: 1, width: 200 });

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    pdf.setFontSize(18);
    pdf.text("Registro de Atención - Respuesta n8n", 40, 50);
    pdf.addImage(qrDataUrl, "PNG", 430, 40, 120, 120);
    pdf.setFontSize(11);
    const lines: string[] = pdf.splitTextToSize(dataString, 500) as string[];
    let cursorY = 190;
    const lineHeight = 14;

    lines.forEach((line: string) => {
      if (cursorY > 740) {
        pdf.addPage();
        cursorY = 40;
      }
      pdf.text(line, 40, cursorY);
      cursorY += lineHeight;
    });

    pdf.save(`respuesta-webhook-${Date.now()}.pdf`);
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

          {status === "no-procede" && responseData ? (
            <div className="rounded-xl p-6 transition-all" style={{ background: "rgba(220, 38, 38, 0.12)" }}>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h2 className="text-center text-2xl font-semibold text-red-900">No procede</h2>
              <p className="mt-3 text-center text-sm text-red-700">
                El hospital no tiene convenio con la aseguradora indicada y no puede tramitar el ingreso en este momento.
              </p>
              <p className="mt-3 text-center text-sm text-red-700">
                Se asignará una ambulancia de preferencia para su traslado.
              </p>
              <div className="mt-4 text-left rounded-xl border border-red-200 bg-white p-4 overflow-x-auto">
                <pre className="text-xs leading-5 text-red-900 whitespace-pre-wrap break-words">
                  {JSON.stringify(responseData, null, 2)}
                </pre>
              </div>
              <div className="mt-5 flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setResponseData(null);
                    setStatus("idle");
                  }}
                  className="inline-flex items-center justify-center rounded-xl border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-900 hover:bg-red-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : status === "success" && responseData ? (
            <div className="rounded-xl p-6 transition-all" style={{ background: "var(--hospital-blue-soft)" }}>
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--hospital-green)" }} />
              <p className="text-sm text-muted-foreground">Respuesta recibida del webhook</p>
              <div className="mt-4 text-left rounded-xl border border-border bg-background p-4 overflow-x-auto">
                <pre className="text-xs leading-5 text-foreground whitespace-pre-wrap break-words">
                  {JSON.stringify(responseData, null, 2)}
                </pre>
              </div>
              <div className="mt-5 flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={downloadPDF}
                  className="inline-flex items-center justify-center rounded-xl bg-hospital-blue px-4 py-3 text-sm font-semibold text-white hover:opacity-95"
                  style={{ boxShadow: "0 8px 20px -8px var(--hospital-blue)" }}
                >
                  Descargar PDF con QR
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResponseData(null);
                    setStatus("idle");
                  }}
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : status === "loading" ? (
            <div className="rounded-xl p-6 text-center">
              <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin" />
              <p className="text-sm text-muted-foreground">Creando ticket...</p>
              <p className="text-sm text-muted-foreground mt-2">Esperando respuesta del webhook de n8n</p>
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
                onChange={(v) => {
                  // Solo dígitos, máximo 10
                  const onlyDigits = v.replace(/\D/g, "").slice(0, 10);
                  setForm({ ...form, cedula: onlyDigits });
                  if (errors.cedula) setErrors({});
                }}
                inputMode="numeric"
                error={errors.cedula}
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
                  {webhookError ?? "Ocurrió un error. Intente nuevamente."}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 rounded-xl text-base font-semibold text-white transition-all duration-200 hover:opacity-95 active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2"
                style={{
                  background: "var(--hospital-blue)",
                  boxShadow: "0 8px 20px -8px var(--hospital-blue)",
                }}
              >
                {isLoading ? (
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
  error,
}: {
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  inputMode?: "numeric" | "text";
  error?: string;
}) {
  const base =
    "w-full rounded-xl border bg-background px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground/70 outline-none transition-all focus:border-transparent focus:ring-4 focus:ring-[color:var(--hospital-blue-soft)] focus:shadow-[0_0_0_1px_var(--hospital-blue)]";
  const borderClass = error
    ? "border-[color:var(--hospital-red)] focus:shadow-[0_0_0_1px_var(--hospital-red)]"
    : "border-border";
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
          className={`${base} ${borderClass} resize-none`}
        />
      ) : (
        <input
          required
          type="text"
          inputMode={inputMode}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${base} ${borderClass}`}
        />
      )}
      {error && (
        <p className="mt-1.5 text-xs flex items-center gap-1" style={{ color: "var(--hospital-red)" }}>
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </label>
  );
}
