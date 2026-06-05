import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import LocalFileChart from "./pages/LocalFileChart";
import DatabaseChart from "./pages/DatabaseChart";
import DataFusion from "./pages/DataFusion";
import NotFound from "./pages/NotFound";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/local-file" element={<LocalFileChart />} />
        <Route path="/database" element={<DatabaseChart />} />
        <Route path="/fusion" element={<DataFusion />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
