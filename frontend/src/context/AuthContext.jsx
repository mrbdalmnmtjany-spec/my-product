import { createContext, useContext, useEffect, useState } from "react";
import { connectSocket, disconnectSocket } from "../utils/socket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("moaaz_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = (userData, token) => {
    localStorage.setItem("moaaz_token", token);
    localStorage.setItem("moaaz_user", JSON.stringify(userData));
    setUser(userData);
    connectSocket(token);
  };

  const logout = () => {
    localStorage.removeItem("moaaz_token");
    localStorage.removeItem("moaaz_user");
    setUser(null);
    disconnectSocket();
  };

  // بعد تعديل البروفايل (الاسم/البايو/الأفاتار) لازم نحدّث الحالة و localStorage
  // مع بعض عشان لو المستخدم عمل refresh للصفحة ميرجعش يشوف البيانات القديمة
  const updateUser = (patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem("moaaz_user", JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("moaaz_token");
    if (token && user) connectSocket(token);
  }, []); // eslint-disable-line

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, updateUser, loading, setLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
