import LoginForm from "./LoginForm";

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const error =
    typeof searchParams.error === "string" ? searchParams.error : undefined;
  const next =
    typeof searchParams.next === "string" ? searchParams.next : undefined;

  return <LoginForm error={error} next={next} />;
}
