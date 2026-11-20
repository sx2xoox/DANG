import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { SiteProvider } from "./lib/site";
import { Spinner, ToastProvider } from "./components/ui";
import { Layout } from "./components/Layout";
import Home from "./pages/Home";
import Write from "./pages/Write";
import Done from "./pages/Done";
import Check from "./pages/Check";
import ReplyView from "./pages/ReplyView";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Me from "./pages/Me";
import MyStory from "./pages/MyStory";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";

// 관리자 / OBS 화면은 시청자에게 필요 없으므로 따로 불러옵니다.
const AdminApp = lazy(() => import("./admin/AdminApp"));
const ObsPage = lazy(() => import("./obs/ObsPage"));

export default function App() {
  return (
    <SiteProvider>
      <ToastProvider>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/admin/*" element={<AdminApp />} />
            <Route path="/obs" element={<ObsPage />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/write" element={<Write />} />
              <Route path="/write/done" element={<Done />} />
              <Route path="/check" element={<Check />} />
              <Route path="/reply/:no" element={<ReplyView />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/me" element={<Me />} />
              <Route path="/me/story/:id" element={<MyStory />} />
              <Route path="/me/account" element={<Account />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </ToastProvider>
    </SiteProvider>
  );
}
