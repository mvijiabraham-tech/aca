import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

const ALLOWED_EMAILS = new Set([
  "mvijiabraham@gmail.com",
  "alex@synovate.co.in",
  "cyril@synovate.co.in",
  "abraham@synovate.co.in",
]);

export function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already logged in — redirect to home
  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim().toLowerCase();
    if (!ALLOWED_EMAILS.has(trimmed)) {
      setError("This email is not authorised to access ACA. Contact your Lead Assessor.");
      return;
    }

    setSubmitting(true);
    const result = await signIn(trimmed);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen surface-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-navy-700 flex items-center justify-center mx-auto mb-4">
            <div className="w-5 h-5 rounded-sm bg-ocean-300" />
          </div>
          <h1 className="display-serif text-3xl font-semibold text-navy-700">
            Synovate ACA
          </h1>
          <p className="text-sm text-ink-500 mt-1">Assessment Centre Application</p>
        </div>

        <Card>
          <CardBody className="p-8">
            {sent ? (
              /* Success state */
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={28} />
                </div>
                <h2 className="display-serif text-xl font-semibold text-navy-700">
                  Check your email
                </h2>
                <p className="text-sm text-ink-500 mt-3 leading-relaxed">
                  We sent an access link to <strong className="text-navy-700">{email}</strong>.
                  Click the link in that email to sign in.
                </p>
                <button
                  type="button"
                  onClick={() => { setSent(false); setEmail(""); }}
                  className="mt-6 text-sm text-ocean-700 hover:text-ocean-800 font-medium"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              /* Login form */
              <>
                <h2 className="display-serif text-xl font-semibold text-navy-700 text-center mb-1">
                  Sign in
                </h2>
                <p className="text-sm text-ink-500 text-center mb-6">
                  Enter your email to receive an access link.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="text-2xs uppercase tracking-wider font-semibold text-ink-600 block mb-1.5">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-ink-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-600/20 focus:border-ocean-400 transition-colors"
                        autoFocus
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    disabled={submitting || !email.trim()}
                  >
                    {submitting ? "Sending…" : (
                      <>Send ACA access link <ArrowRight size={14} /></>
                    )}
                  </Button>
                </form>
              </>
            )}
          </CardBody>
        </Card>

        <p className="text-center text-2xs text-ink-400 mt-6">
          No account? Contact your Lead Assessor to be added to an engagement.
        </p>
      </div>
    </div>
  );
}
