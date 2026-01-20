import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useLoading } from "../context/LoadingContext";
import { injectLoader } from "../api/axiosConfig";

export default function MainLayout() {
  const { startLoading, stopLoading } = useLoading();

  useEffect(() => {
    injectLoader(startLoading, stopLoading);
  }, [startLoading, stopLoading]);

  return (
    <div className="flex h-screen w-full">
      <Sidebar />

      <div className="flex flex-col flex-1">
        <Header />

        <main className="p-6 bg-gray-100 flex-1 overflow-auto">
          <Outlet /> {/* Page content renders here */}
        </main>
      </div>
    </div>
  );
}
