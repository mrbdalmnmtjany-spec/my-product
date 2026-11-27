import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext.jsx";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");
  const { login } = useAuth();

  useEffect(() => {
    const token = params.get("token");
    const email = params.get("email");

    if (!token || !email) {
      setStatus("error");
      setMessage("رابط التفعيل غير صالح");
      return;
    }

    api
      .get(`/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`)
      .then(({ data }) => {
        setStatus("success");
        setMessage(data.message);
        login(data.user, data.token);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.message || "فشل تفعيل الحساب");
      });
  }, [params]); // eslint-disable-line

  return (
    <div className="min-h-screen-safe bg-room-bg flex items-center justify-center p-4">
      <div className="bg-room-panel border border-room-border rounded-2xl p-8 max-w-sm w-full text-center shadow-soft">
        {status === "loading" && (
          <Loader2 className="animate-spin text-room-gold mx-auto mb-4" size={40} />
        )}
        {status === "success" && (
          <CheckCircle2 className="text-green-500 mx-auto mb-4" size={40} />
        )}
        {status === "error" && <XCircle className="text-red-500 mx-auto mb-4" size={40} />}

        <h2 className="text-room-cream font-display text-xl mb-2">
          {status === "loading" ? "جارِ تفعيل حسابك..." : status === "success" ? "تم التفعيل 🎉" : "حصلت مشكلة"}
        </h2>
        <p className="text-room-muted text-sm mb-6">{message}</p>

        {status === "success" && (
          <Link
            to="/chat"
            className="inline-block bg-room-gold text-room-bg font-bold px-6 py-2.5 rounded-lg"
          >
            ادخل الغرفة
          </Link>
        )}
        {status === "error" && (
          <Link to="/" className="inline-block text-room-gold underline text-sm">
            رجوع لتسجيل الدخول
          </Link>
        )}
      </div>
    </div>
  );
}
