import { Layers } from "lucide-react";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-xs">
        {/* Wordmark */}
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-black">
            <Layers className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-black">
            weft
          </span>
        </div>

        <h1 className="mb-1.5 text-base font-semibold text-black">Create account</h1>
        <p className="mb-6 text-sm text-gray-400">
          Get started with weft.
        </p>

        <RegisterForm />
      </div>
    </div>
  );
}
