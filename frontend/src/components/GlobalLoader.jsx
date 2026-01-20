import { useLoading } from "../context/LoadingContext";

export default function GlobalLoader() {
  const { loading } = useLoading();

  if (!loading) return null;

  return (
    <div className="global-loader">
      <div className="spinner" />
      <span>Loading...</span>
    </div>
  );
}
