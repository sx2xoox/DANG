import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { captureRef, captureRefFromLocation } from "./lib/growth";
import { SiteProvider } from "./lib/site";
import { Spinner, ToastProvider } from "./components/ui";
import { Layout } from "./components/Layout";
import Home from "./pages/Home";
import Write from "./pages/Write";
import Done from "./pages/Done";
import Check from "./pages/Check";
import StoryLookup from "./pages/StoryLookup";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Me from "./pages/Me";
import MyStory from "./pages/MyStory";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";

// 관리자 / OBS 화면은 시청자에게 필요 없으므로 따로 불러옵니다.
const AdminApp = lazy(() => import("./admin/AdminApp"));
const ObsPage = lazy(() => import("./obs/ObsPage"));

/** 릴스·쇼츠용 주소 (사이트주소/v/12): 어느 영상에서 왔는지 기억하고 첫 화면으로 */
function VideoEntry() {
  const { ref } = useParams();
  useEffect(() => {
    captureRef(ref);
  }, [ref]);
  return <Navigate to="/" replace />;
}

export default function App() {
  useEffect(() => {
    captureRefFromLocation();
  }, []);

  return (
    <SiteProvider>
      <ToastProvider>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/admin/*" element={<AdminApp />} />
            <Route path="/obs" element={<ObsPage />} />
            <Route path="/v/:ref" element={<VideoEntry />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/write" element={<Write />} />
              <Route path="/write/done" element={<Done />} />
              <Route path="/check" element={<Check />} />
              <Route path="/story/:no" element={<StoryLookup />} />
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
