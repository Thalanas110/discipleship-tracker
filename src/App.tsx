import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Disciples from "./pages/Disciples";
import DiscipleProfile from "./pages/DiscipleProfile";
import Groups from "./pages/Groups";
import Meetings from "./pages/Meetings";
import FollowUps from "./pages/FollowUps";
import Habits from "./pages/Habits";
import Prayer from "./pages/Prayer";
import Milestones from "./pages/Milestones";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="disciples" element={<Disciples />} />
              <Route path="disciples/:id" element={<DiscipleProfile />} />
              <Route path="groups" element={<Groups />} />
              <Route path="meetings" element={<Meetings />} />
              <Route path="follow-ups" element={<FollowUps />} />
              <Route path="habits" element={<Habits />} />
              <Route path="prayer" element={<Prayer />} />
              <Route path="milestones" element={<Milestones />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
