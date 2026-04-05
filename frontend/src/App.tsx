import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import ResearchResult from './pages/ResearchResult';
import History from './pages/History';
import Navbar from './components/layout/navbar';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans">
        <Navbar /> 
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/advanced-generator" element={<Navigate to="/" replace />} />
          <Route path="/history" element={<History />} />
          <Route path="/article/:id" element={<ResearchResult />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
