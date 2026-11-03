import { AuthScreen, authViews, type AuthView } from "../../components/auth-screen";
import "./auth.css";
export const dynamic = "force-dynamic";
export default async function SignIn({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  const { view } = await searchParams;
  const safeView = typeof view === "string" && authViews.includes(view as AuthView) ? view as AuthView : "sign-in";
  return <AuthScreen view={safeView} />;
}
