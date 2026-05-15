// src/app/signup/page.jsx
import SignupForm from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-28 pb-12 md:pt-35 md:pb-20">
      <SignupForm />
    </div>
  );
}