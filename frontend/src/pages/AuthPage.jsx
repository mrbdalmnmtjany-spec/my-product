import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext.jsx";

export default function AuthPage() {
  const [tab, setTab] = useState("signin"); // signin | signup
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const { login } = useAuth();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setNeedsVerification(false);
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", {
        email: form.email,
        password: form.password,
      });
      login(data.user, data.token);
    } catch (err) {
      setError(err.response?.data?.message || "حصل خطأ، حاول تاني");
      if (err.response?.status === 403) setNeedsVerification(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError("");
    setMessage("");
    try {
      const { data } = await api.post("/auth/resend-verification", { email: form.email });
      setMessage(data.message);
      setNeedsVerification(false);
    } catch (err) {
      setError(err.response?.data?.message || "فشل إرسال رابط التفعيل");
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      setMessage(data.message);
      setTab("signin");
    } catch (err) {
      setError(err.response?.data?.message || "حصل خطأ، حاول تاني");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    try {
      const { data } = await api.post("/auth/google", {
        credential: credentialResponse.credential,
      });
      login(data.user, data.token);
    } catch (err) {
      setError(err.response?.data?.message || "فشل تسجيل الدخول بجوجل");
    }
  };

  return (
    <div className="min-h-screen-safe bg-room-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Moaaz Social" className="w-40 h-40 object-contain" />
        </div>

        <div className="bg-room-panel border border-room-border rounded-2xl p-6 shadow-soft">
          <div className="flex gap-6 border-b border-room-border mb-6">
            <button
              onClick={() => setTab("signin")}
              className={`pb-3 font-semibold transition ${
                tab === "signin"
                  ? "text-room-gold border-b-2 border-room-gold"
                  : "text-room-muted"
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`pb-3 font-semibold transition ${
                tab === "signup"
                  ? "text-room-gold border-b-2 border-room-gold"
                  : "text-room-muted"
              }`}
            >
              حساب جديد
            </button>
          </div>

          {message && (
            <p className="text-green-400 text-sm bg-green-900/20 border border-green-800 rounded-lg p-3 mb-4">
              {message}
            </p>
          )}
          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4">
              <p>{error}</p>
              {needsVerification && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  className="mt-2 text-room-gold underline text-xs"
                >
                  ابعتلي رابط التفعيل تاني
                </button>
              )}
            </div>
          )}

          <form onSubmit={tab === "signin" ? handleSignIn : handleSignUp} className="space-y-4">
            {tab === "signup" && (
              <div>
                <label className="text-xs tracking-wide text-room-muted">الاسم</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full mt-1 bg-room-cream text-room-bg rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-room-gold"
                />
              </div>
            )}
            <div>
              <label className="text-xs tracking-wide text-room-muted">البريد الإلكتروني</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full mt-1 bg-room-cream text-room-bg rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-room-gold"
              />
            </div>
            <div>
              <label className="text-xs tracking-wide text-room-muted">كلمة المرور</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full mt-1 bg-room-cream text-room-bg rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-room-gold"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-room-gold hover:bg-room-goldDark text-room-bg font-bold py-3 rounded-lg transition disabled:opacity-60"
            >
              {loading ? "جارِ التحميل..." : tab === "signin" ? "ادخل الغرفة" : "إنشاء حساب"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px bg-room-border flex-1" />
            <span className="text-room-muted text-xs">أو</span>
            <div className="h-px bg-room-border flex-1" />
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("فشل تسجيل الدخول بجوجل")}
              theme="filled_black"
              text="continue_with"
              locale="ar"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
