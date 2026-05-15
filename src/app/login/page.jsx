// src/app/login/page.jsx
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-12 pb-0 md:pt-4 md:pb-4">
      <LoginForm />
    </div>
  );
}