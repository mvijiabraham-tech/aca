import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";

interface AddEngagementModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddEngagementModal({ open, onClose }: AddEngagementModalProps) {
  const navigate = useNavigate();
  const addEngagement = useAppStore((s) => s.addEngagement);
  const existingCodes = useAppStore((s) => s.engagements.map((e) => e.basics.code.toLowerCase()));

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [client, setClient] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);

  // Auto-suggest code when name + client change, until user manually edits
  useEffect(() => {
    if (codeTouched) return;
    if (!client || !name) return;
    const clientPrefix = client.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 3);
    // Extract role hint from name — most engagement names follow "Client — Role AC" pattern
    const rolePart = name.split("—")[1]?.trim() ?? name.split("-")[1]?.trim() ?? "";
    const roleAbbr = rolePart.split(" ").filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
    const year = new Date().getFullYear();
    const suggested = [clientPrefix, roleAbbr, year].filter(Boolean).join("-");
    setCode(suggested);
  }, [name, client, codeTouched]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setName(""); setCode(""); setClient(""); setCodeTouched(false);
    }
  }, [open]);

  if (!open) return null;

  const codeConflict = code && existingCodes.includes(code.toLowerCase());
  const canSubmit = name.trim().length > 2 && code.trim().length > 2 && client.trim().length > 1 && !codeConflict;

  function handleSubmit() {
    if (!canSubmit) return;
    const created = addEngagement({ name: name.trim(), code: code.trim(), client: client.trim() });
    onClose();
    navigate(`/engagement/${created.id}/setup/engagement`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-ink-200">
          <div>
            <h2 className="display-serif text-xl font-semibold text-navy-700">
              Add new engagement
            </h2>
            <p className="text-xs text-ink-500 mt-0.5">
              Three details to get started. You'll fill in the rest in Setup.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-navy-700 transition-colors -mr-1 p-1.5 rounded-md hover:bg-ink-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <Field label="Client name" required>
            <input
              type="text"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="e.g. FirstCry"
              className="w-full px-3 py-2 text-sm border border-ink-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-600/20 focus:border-ocean-400 transition-colors"
              autoFocus
            />
          </Field>

          <Field label="Engagement name" required hint="A descriptive title — usually includes the role or programme name.">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. FirstCry — Cluster Manager AC"
              className="w-full px-3 py-2 text-sm border border-ink-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-600/20 focus:border-ocean-400 transition-colors"
            />
          </Field>

          <Field label="Engagement code" required hint="Used as a short identifier for files and reports. Auto-suggested; editable.">
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value); setCodeTouched(true); }}
              placeholder="e.g. FC-CM-2026"
              className="w-full px-3 py-2 text-sm font-mono border border-ink-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-600/20 focus:border-ocean-400 transition-colors uppercase"
            />
            {codeConflict && (
              <div className="flex items-start gap-1.5 mt-1.5 text-2xs text-red-600">
                <AlertCircle size={11} className="flex-shrink-0 mt-0.5" />
                This code is already in use by another engagement.
              </div>
            )}
          </Field>

          {/* Info strip */}
          <div className="text-2xs text-ink-500 leading-relaxed p-3 rounded-md bg-ink-100/70 border border-ink-200">
            After clicking Create, you'll land on Step 1 of Setup — Engagement basics — where you can
            fill in audience, dates, purpose, and the rest.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 bg-ink-100/40 border-t border-ink-200">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
            <Plus size={13} /> Create & start setup
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, required, hint, children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-2xs uppercase tracking-wider font-semibold text-navy-700">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
      </div>
      {children}
      {hint && <div className="text-2xs text-ink-500 mt-1 leading-relaxed">{hint}</div>}
    </div>
  );
}
